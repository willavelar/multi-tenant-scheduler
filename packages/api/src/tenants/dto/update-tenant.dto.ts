import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

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

  @IsOptional()
  @IsIn(['auto', 'manual'])
  confirmationMode?: 'auto' | 'manual';

  @IsOptional()
  @IsBoolean()
  allowPaidStatus?: boolean;

  @IsOptional()
  @IsIn(['no', 'optional', 'required'])
  cancellationReasonMode?: 'no' | 'optional' | 'required';
}
