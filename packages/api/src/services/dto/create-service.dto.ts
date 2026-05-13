import { IsBoolean, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color must be a valid hex color (e.g. #6366f1)' })
  color: string;
}
