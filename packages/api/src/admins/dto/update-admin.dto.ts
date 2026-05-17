import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200_000)
  avatarUrl?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

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
