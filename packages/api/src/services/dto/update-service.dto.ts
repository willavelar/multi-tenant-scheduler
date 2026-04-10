import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateServiceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
