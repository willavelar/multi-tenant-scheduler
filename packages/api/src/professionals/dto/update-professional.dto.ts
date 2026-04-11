import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateProfessionalDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;          // admin only — enforced in service

  @IsString()
  @IsIn(['tenant_admin', 'professional', 'client'])
  @IsOptional()
  role?: string;             // admin only — enforced in service
}
