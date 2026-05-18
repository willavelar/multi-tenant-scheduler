import { IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListTenantsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
