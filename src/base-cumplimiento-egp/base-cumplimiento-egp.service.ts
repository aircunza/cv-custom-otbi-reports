import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import type { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  BaseCumplimientoEgpFilterDto,
  BaseCumplimientoEgpFilterOperator,
  FindAllBaseCumplimientoEgpDto,
} from './dto';
import {
  DATE_ONLY_FIELD,
  DATETIME_FIELD,
  FILTERABLE_FIELDS,
  TEXT_FIELDS,
} from './base-cumplimiento-egp.fields';

const INVALID_FILTER_DATA_MESSAGE = 'Invalid filter data';
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TEXT_FIELD_SET = new Set<string>(TEXT_FIELDS);

@Injectable()
export class BaseCumplimientoEgpService {
  private readonly logger = new Logger(BaseCumplimientoEgpService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: FindAllBaseCumplimientoEgpDto) {
    try {
      const where = this.buildFindAllWhere(dto.filters);
      const orderBy = this.buildFindAllOrder(dto.order);
      const take = this.parsePaginationValue(dto.limit);
      const skip = this.parsePaginationValue(dto.offset);

      const [rows, total] = await this.prisma.$transaction([
        this.prisma.baseCumplimientoEgp.findMany({
          where,
          orderBy,
          take,
          skip,
        }),
        this.prisma.baseCumplimientoEgp.count({ where }),
      ]);

      return { baseCumplimientoEgp: rows, total };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error('Error finding base_cumplimiento_egp', error);
      throw new RpcException({ status: 500, message: 'Internal server error' });
    }
  }

  private buildFindAllWhere(
    filters: FindAllBaseCumplimientoEgpDto['filters'],
  ): Prisma.BaseCumplimientoEgpWhereInput {
    if (filters === undefined) {
      return {};
    }

    if (!Array.isArray(filters)) {
      throw this.invalidFilterDataException();
    }

    const conditions = filters.map((filter) =>
      this.mapFilterToWhereCondition(filter),
    );

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  private buildFindAllOrder(
    order: FindAllBaseCumplimientoEgpDto['order'],
  ): Prisma.BaseCumplimientoEgpOrderByWithRelationInput[] {
    if (order === undefined) {
      return [{ fecha: 'desc' }, { id: 'desc' }];
    }

    if (!Array.isArray(order)) {
      throw this.invalidFilterDataException();
    }

    const mapped = order.map((criterion) => {
      if (!Array.isArray(criterion) || criterion.length !== 2) {
        throw this.invalidFilterDataException();
      }

      const [rawField, rawDirection] = criterion;

      if (
        typeof rawField !== 'string' ||
        !FILTERABLE_FIELDS.has(rawField) ||
        typeof rawDirection !== 'string'
      ) {
        throw this.invalidFilterDataException();
      }

      const direction = rawDirection.toLowerCase();
      if (direction !== 'asc' && direction !== 'desc') {
        throw this.invalidFilterDataException();
      }

      return {
        [rawField]: direction,
      };
    });

    return mapped.length > 0 ? mapped : [{ fecha: 'desc' }, { id: 'desc' }];
  }

  private mapFilterToWhereCondition(
    filter: BaseCumplimientoEgpFilterDto,
  ): Prisma.BaseCumplimientoEgpWhereInput {
    if (!filter || typeof filter !== 'object') {
      throw this.invalidFilterDataException();
    }

    const { field, operator, value } = filter;

    if (
      typeof field !== 'string' ||
      !FILTERABLE_FIELDS.has(field) ||
      typeof operator !== 'string'
    ) {
      throw this.invalidFilterDataException();
    }

    const normalizedOperator =
      operator.toLowerCase() as BaseCumplimientoEgpFilterOperator;

    switch (normalizedOperator) {
      case 'eq':
        return {
          [field]: this.normalizeFieldValue(field, value),
        };
      case 'like': {
        if (!TEXT_FIELD_SET.has(field) || typeof value !== 'string') {
          throw this.invalidFilterDataException();
        }
        return {
          [field]: { contains: value },
        };
      }
      case 'gt':
        return {
          [field]: { gt: this.normalizeFieldValue(field, value) },
        };
      case 'lt':
        return {
          [field]: { lt: this.normalizeFieldValue(field, value) },
        };
      case 'in': {
        if (!Array.isArray(value)) {
          throw this.invalidFilterDataException();
        }
        return {
          [field]: {
            in: value.map((item) => this.normalizeFieldValue(field, item)),
          },
        };
      }
      default:
        throw this.invalidFilterDataException();
    }
  }

  private normalizeFieldValue(field: string, value: unknown): string | Date {
    if (field === DATE_ONLY_FIELD) {
      // FECHA es solo fecha (sin hora): se compara como medianoche UTC.
      if (typeof value === 'string' && DATE_ONLY_REGEX.test(value)) {
        const parsed = new Date(`${value}T00:00:00.000Z`);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      throw this.invalidFilterDataException();
    }

    if (field === DATETIME_FIELD) {
      // FECHA_CONSULTA se guarda en UTC; el filtro debe llegar en ISO 8601.
      if (typeof value === 'string') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      throw this.invalidFilterDataException();
    }

    if (typeof value !== 'string') {
      throw this.invalidFilterDataException();
    }

    return value;
  }

  private parsePaginationValue(value: unknown): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== 'number' && typeof value !== 'string') {
      throw this.invalidFilterDataException();
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw this.invalidFilterDataException();
    }

    return parsed;
  }

  private invalidFilterDataException(): RpcException {
    return new RpcException({
      status: 400,
      message: INVALID_FILTER_DATA_MESSAGE,
    });
  }
}
