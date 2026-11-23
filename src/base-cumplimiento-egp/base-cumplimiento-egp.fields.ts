// Mapeo de encabezados del .xlsx (orden original) -> nombre del campo en Prisma.
// Fuente unica: la usan el importador y los filtros del endpoint.
export const EXCEL_TO_FIELD: Readonly<Record<string, string>> = {
  NEGOCIO_PAIS: 'negocioPais',
  ORGANIZATION_CODE: 'organizationCode',
  ORGANIZATION_NAME: 'organizationName',
  WORK_AREA_CODE: 'workAreaCode',
  WORK_CENTER_CODE: 'workCenterCode',
  RESOURCE_CODE: 'resourceCode',
  RESOURCE_NAME: 'resourceName',
  USAGE_RATE: 'usageRate',
  GRUPO: 'grupo',
  RESOURCE_CLASS_CODE: 'resourceClassCode',
  RESOURCE_QUANTITY: 'resourceQuantity',
  FECHA: 'fecha',
  STANDARD_OPERATION_CODE: 'standardOperationCode',
  TURNO_REPORTADO: 'turnoReportado',
  MODELO: 'modelo',
  CODIGO_PRODUCTO: 'codigoProducto',
  DESCRIPCION_PRODUCTO: 'descripcionProducto',
  UDM: 'udm',
  FMIL: 'fmil',
  UNDRECMAX: 'undRecMax',
  HPOK: 'hpok',
  TON: 'ton',
  MIL: 'mil',
  META: 'meta',
  HPOKACUM: 'hpokAcum',
  HPRGDIA: 'hprgdia',
  HPRGDIACUM: 'hprgdiaAcum',
  HDIACUM: 'hdiaAcum',
  CVJ_INVENTARIO: 'cvjInventario',
  CVJ_COSTOS_PAC: 'cvjCostosPac',
  CVJ_CORPORATIVA: 'cvjCorporativa',
  UNDPRD: 'undPrd',
  FECHA_CONSULTA: 'fechaConsulta',
};

// Campos de fecha (no son texto). FECHA es solo fecha; FECHA_CONSULTA es fecha y hora (UTC en BD).
export const DATE_ONLY_FIELD = 'fecha';
export const DATETIME_FIELD = 'fechaConsulta';

export const TEXT_FIELDS: readonly string[] = Object.values(
  EXCEL_TO_FIELD,
).filter((field) => field !== DATE_ONLY_FIELD && field !== DATETIME_FIELD);

export const FILTERABLE_FIELDS: ReadonlySet<string> = new Set(
  Object.values(EXCEL_TO_FIELD),
);

// Longitud maxima por campo de texto. Debe coincidir con @db.NVarChar del schema.
// Los campos no listados usan TEXT_FIELD_DEFAULT_MAX_LENGTH (100).
export const TEXT_FIELD_DEFAULT_MAX_LENGTH = 100;
export const TEXT_FIELD_MAX_LENGTH: Readonly<Record<string, number>> = {
  organizationName: 255,
  workAreaCode: 255,
  workCenterCode: 255,
  resourceCode: 255,
  resourceName: 255,
  descripcionProducto: 255,
};
