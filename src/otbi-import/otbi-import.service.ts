import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs/promises';
import * as XLSX from 'xlsx';
import type { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma.service';
import { envs } from 'src/config';
import {
  DATE_ONLY_FIELD,
  DATETIME_FIELD,
  EXCEL_TO_FIELD,
  TEXT_FIELD_DEFAULT_MAX_LENGTH,
  TEXT_FIELD_MAX_LENGTH,
} from 'src/base-cumplimiento-egp/base-cumplimiento-egp.fields';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000;
// 33 columnas por fila: 50 filas = 1650 parametros (SQL Server admite maximo 2100).
const INSERT_BATCH_SIZE = 50;
// Hora Peru (America/Lima) es UTC-5 todo el ano, sin horario de verano.
const PERU_TO_UTC_OFFSET_HOURS = 5;
const TRANSACTION_TIMEOUT_MS = 5 * 60 * 1000;

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})/;
const DATETIME_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

export interface ImportTriggerResult {
  started: boolean;
  message: string;
}

type ImportRecord = Prisma.BaseCumplimientoEgpCreateManyInput & {
  organizationCode: string;
  fecha: Date;
};

@Injectable()
export class OtbiImportService {
  private readonly logger = new Logger(OtbiImportService.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(envs.importCron, {
    name: 'otbi-import',
    timeZone: envs.importTimezone,
  })
  handleScheduledImport(): void {
    this.logger.log('[0] Cron disparado');
    const result = this.startImport('cron');
    if (!result.started) {
      this.logger.warn(`Scheduled import skipped: ${result.message}`);
    }
  }

  /**
   * Inicia la importacion en segundo plano. No espera a que termine
   * (los reintentos pueden durar varios minutos).
   */
  startImport(trigger: 'cron' | 'manual'): ImportTriggerResult {
    this.logger.log(
      `[0] Solicitud de importacion recibida (trigger: ${trigger})`,
    );

    if (this.running) {
      this.logger.warn(
        '[0] Ya hay una importacion en curso. Se ignora la solicitud.',
      );
      return { started: false, message: 'Import already running' };
    }

    this.running = true;
    this.logger.log(
      `[0] Importacion iniciada. Ruta configurada: ${envs.otbiFilePath}`,
    );

    void this.runWithRetries()
      .catch((error: unknown) => {
        this.logger.error('Import failed unexpectedly', this.stackOf(error));
      })
      .finally(() => {
        this.running = false;
        this.logger.log(
          '[FIN] Proceso de importacion terminado (candado liberado)',
        );
      });

    return { started: true, message: 'Import started' };
  }

  private async runWithRetries(): Promise<void> {
    const filePath = envs.otbiFilePath;

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        this.logger.log(`[1] Intento ${attempt}/${MAX_ATTEMPTS}`);
        try {
          await this.importFile(filePath);
          this.logger.log(
            `[OK] Intento ${attempt}/${MAX_ATTEMPTS} terminado con exito`,
          );
          return;
        } catch (error) {
          this.logger.error(
            `[ERROR] Intento ${attempt}/${MAX_ATTEMPTS} fallo: ${this.errorMessage(error)}`,
            this.stackOf(error),
          );
          if (attempt < MAX_ATTEMPTS) {
            this.logger.log(
              `Esperando ${RETRY_DELAY_MS / 60000} min antes del siguiente intento`,
            );
            await this.sleep(RETRY_DELAY_MS);
          }
        }
      }

      this.logger.error(
        `[ERROR] Importacion fallida tras ${MAX_ATTEMPTS} intentos. Se eliminara el archivo fuente.`,
      );
    } finally {
      await this.removeSourceFile(filePath);
    }
  }

  private async importFile(filePath: string): Promise<void> {
    this.logger.log(`[2] Leyendo archivo: ${filePath}`);
    const records = await this.readRecords(filePath);
    this.logger.log(`[3] Filas validas leidas del archivo: ${records.length}`);

    if (records.length === 0) {
      this.logger.warn(
        '[3] El archivo no tiene filas de datos. No se importo nada.',
      );
      return;
    }

    const organizationCodes = [
      ...new Set(records.map((record) => record.organizationCode)),
    ];
    const times = records.map((record) => record.fecha.getTime());
    const minFecha = new Date(Math.min(...times));
    const maxFecha = new Date(Math.max(...times));
    this.logger.log(
      `[4] Organizaciones: [${organizationCodes.join(', ')}] | ` +
        `rango FECHA: ${minFecha.toISOString().slice(0, 10)} a ${maxFecha.toISOString().slice(0, 10)}`,
    );

    this.logger.log('[5] Iniciando transaccion (DELETE + INSERT)');
    await this.prisma.$transaction(
      async (tx) => {
        const deleted = await tx.baseCumplimientoEgp.deleteMany({
          where: {
            organizationCode: { in: organizationCodes },
            fecha: { gte: minFecha, lte: maxFecha },
          },
        });
        this.logger.log(
          `[5a] DELETE ejecutado: ${deleted.count} filas eliminadas`,
        );

        const batches = Math.ceil(records.length / INSERT_BATCH_SIZE);
        for (let i = 0; i < records.length; i += INSERT_BATCH_SIZE) {
          const batchNumber = i / INSERT_BATCH_SIZE + 1;
          await tx.baseCumplimientoEgp.createMany({
            data: records.slice(i, i + INSERT_BATCH_SIZE),
          });
          this.logger.log(`[5b] INSERT lote ${batchNumber}/${batches} ok`);
        }

        this.logger.log(
          `[5c] Transaccion lista para COMMIT (${records.length} filas insertadas)`,
        );
      },
      { timeout: TRANSACTION_TIMEOUT_MS, maxWait: 10000 },
    );
    this.logger.log('[6] COMMIT realizado. Importacion completada.');
  }

  private async readRecords(filePath: string): Promise<ImportRecord[]> {
    // stat antes de leer: distingue "no existe" de "bloqueado" o "sin permisos".
    try {
      const stat = await fs.stat(filePath);
      this.logger.log(`[2a] Archivo encontrado. Tamano: ${stat.size} bytes`);
    } catch (error) {
      throw new Error(
        `No se encuentra el archivo en "${filePath}": ${this.errorMessage(error)}`,
      );
    }

    // readFile lanza EBUSY/EPERM si el archivo esta abierto en Excel (Windows).
    const buffer = await fs.readFile(filePath);
    this.logger.log(`[2b] Archivo leido en memoria: ${buffer.length} bytes`);

    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    this.logger.log(
      `[2c] Hojas encontradas: [${workbook.SheetNames.join(', ')}]`,
    );
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('The workbook has no sheets');
    }

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(
      workbook.Sheets[sheetName],
      { header: 1, raw: true, defval: null, blankrows: false },
    );
    this.logger.log(
      `[2d] Filas en la hoja "${sheetName}" (incluye encabezado): ${matrix.length}`,
    );

    if (matrix.length === 0) {
      return [];
    }

    const headers = matrix[0].map((header) => this.cellToString(header) ?? '');
    this.logger.log(
      `[2e] Encabezados encontrados (${headers.length}): ${headers.join(' | ')}`,
    );

    const headerIndex = new Map<string, number>();
    headers.forEach((header, index) => headerIndex.set(header, index));

    const missing = Object.keys(EXCEL_TO_FIELD).filter(
      (header) => !headerIndex.has(header),
    );
    if (missing.length > 0) {
      throw new Error(`Missing columns in source file: ${missing.join(', ')}`);
    }
    this.logger.log('[2f] Las 33 columnas esperadas estan presentes');

    const records: ImportRecord[] = [];
    let skippedEmpty = 0;

    for (let rowNumber = 1; rowNumber < matrix.length; rowNumber++) {
      const row = matrix[rowNumber];
      const values = Object.keys(EXCEL_TO_FIELD).map((header) =>
        this.cellToString(row[headerIndex.get(header)!]),
      );

      if (values.every((value) => value === null)) {
        skippedEmpty++;
        continue;
      }

      try {
        records.push(this.mapRow(row, headerIndex));
      } catch (error) {
        throw new Error(
          `Fila ${rowNumber + 1} del Excel: ${this.errorMessage(error)}`,
        );
      }
    }

    this.logger.log(
      `[2g] Filas mapeadas: ${records.length} | filas vacias omitidas: ${skippedEmpty}`,
    );
    if (records.length > 0) {
      this.logger.debug(
        `[2h] Primera fila mapeada: ${JSON.stringify(records[0])}`,
      );
    }

    return records;
  }

  private mapRow(
    row: unknown[],
    headerIndex: Map<string, number>,
  ): ImportRecord {
    const record: Record<string, unknown> = {};

    for (const [header, field] of Object.entries(EXCEL_TO_FIELD)) {
      const raw = this.cellToString(row[headerIndex.get(header)!]);

      if (field === DATE_ONLY_FIELD) {
        record[field] = this.parseDateOnly(header, raw);
      } else if (field === DATETIME_FIELD) {
        record[field] = this.parseLocalDateTimeToUtc(header, raw);
      } else {
        const maxLength =
          TEXT_FIELD_MAX_LENGTH[field] ?? TEXT_FIELD_DEFAULT_MAX_LENGTH;
        if (raw !== null && raw.length > maxLength) {
          throw new Error(
            `${header} exceeds ${maxLength} characters (length ${raw.length})`,
          );
        }
        record[field] = raw;
      }
    }

    if (record.organizationCode === null) {
      throw new Error('ORGANIZATION_CODE is required');
    }

    return record as unknown as ImportRecord;
  }

  /** Quita la comilla simple inicial que trae cada celda y los espacios. */
  private cellToString(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    let text = String(value).trim();
    if (text.startsWith("'")) {
      text = text.slice(1).trim();
    }

    return text === '' ? null : text;
  }

  /** FECHA viene como texto "YYYY-MM-DD" (fecha local Peru, sin hora). Se guarda tal cual. */
  private parseDateOnly(header: string, raw: string | null): Date {
    const match = raw === null ? null : DATE_ONLY_REGEX.exec(raw);
    if (!match) {
      throw new Error(`${header} must be YYYY-MM-DD, got "${raw ?? ''}"`);
    }

    return new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    );
  }

  /** FECHA_CONSULTA viene en hora Peru ("YYYY-MM-DD HH:mm:ss"); se convierte a UTC. */
  private parseLocalDateTimeToUtc(
    header: string,
    raw: string | null,
  ): Date | null {
    if (raw === null) {
      return null;
    }

    const match = DATETIME_REGEX.exec(raw);
    if (!match) {
      throw new Error(`${header} must be YYYY-MM-DD HH:mm:ss, got "${raw}"`);
    }

    const utc = new Date(
      Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]) + PERU_TO_UTC_OFFSET_HOURS,
        Number(match[5]),
        Number(match[6] ?? 0),
      ),
    );

    if (Number.isNaN(utc.getTime())) {
      throw new Error(`${header} is not a valid date: "${raw}"`);
    }

    return utc;
  }

  private async removeSourceFile(filePath: string): Promise<void> {
    try {
      await fs.rm(filePath, { force: true });
      this.logger.log(`[FIN] Archivo fuente eliminado: ${filePath}`);
    } catch (error) {
      this.logger.error(
        `[FIN] No se pudo eliminar el archivo fuente: ${this.errorMessage(error)}`,
        this.stackOf(error),
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private stackOf(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}
