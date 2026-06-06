import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../common/constants/password';

export class UpdateSuperAdminUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password?: string;
}
