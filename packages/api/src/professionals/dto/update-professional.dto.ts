import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';


export class UpdateProfessionalDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200_000)
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;          // admin only — enforced in service

  @IsString()
  @IsIn(['tenant_admin', 'professional', 'client'])
  @IsOptional()
  role?: string;             // admin only — enforced in service

  @IsString()
  @IsIn(['12h', '24h'])
  @IsOptional()
  timeFormat?: string;

  @IsBoolean()
  @IsOptional()
  notifyViaSystem?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyViaEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyViaWhatsapp?: boolean;
}
