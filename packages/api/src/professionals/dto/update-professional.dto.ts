import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProfessionalDto {
  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
