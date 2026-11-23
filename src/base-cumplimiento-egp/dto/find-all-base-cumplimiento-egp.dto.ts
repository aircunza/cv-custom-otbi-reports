import { IsArray, IsOptional } from 'class-validator';

export const BCE_FIND_ALL_OPERATORS = ['eq', 'like', 'gt', 'lt', 'in'] as const;
export type BaseCumplimientoEgpFilterOperator =
  (typeof BCE_FIND_ALL_OPERATORS)[number];

export class BaseCumplimientoEgpFilterDto {
  field!: string;

  operator!: BaseCumplimientoEgpFilterOperator;

  value!: unknown;
}

export class FindAllBaseCumplimientoEgpDto {
  @IsOptional()
  @IsArray()
  filters?: BaseCumplimientoEgpFilterDto[];

  @IsOptional()
  @IsArray()
  order?: Array<[string, 'asc' | 'desc' | 'ASC' | 'DESC']>;

  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;
}
