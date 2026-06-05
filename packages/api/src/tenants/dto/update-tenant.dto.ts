import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @ValidateIf((o) => o.logoUrl !== null)
  @IsString()
  @MaxLength(1_500_000)
  logoUrl?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.logoDarkUrl !== null)
  @IsString()
  @MaxLength(1_500_000)
  logoDarkUrl?: string | null;

  @IsOptional()
  @IsIn(['auto', 'manual'])
  confirmationMode?: 'auto' | 'manual';

  @IsOptional()
  @IsBoolean()
  allowPaidStatus?: boolean;

  @IsOptional()
  @IsIn(['no', 'optional', 'required'])
  cancellationReasonMode?: 'no' | 'optional' | 'required';

  @IsOptional()
  @ValidateIf((o) => o.cancellationDeadlineValue !== null)
  @IsInt()
  @Min(1)
  @Max(9999)
  cancellationDeadlineValue?: number | null;

  @IsOptional()
  @ValidateIf((o) => o.cancellationDeadlineUnit !== null)
  @IsIn(['minutes', 'hours', 'days'])
  cancellationDeadlineUnit?: 'minutes' | 'hours' | 'days' | null;
}
