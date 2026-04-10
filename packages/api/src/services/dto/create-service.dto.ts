import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsString()
  @IsOptional()
  description?: string;
}
