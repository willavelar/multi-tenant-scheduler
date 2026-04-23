import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @ValidateIf((o) => o.logoUrl !== null)
  @IsString()
  @MaxLength(200_000)
  logoUrl?: string | null;
}
