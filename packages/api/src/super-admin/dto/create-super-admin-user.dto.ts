import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../common/constants/password';

export class CreateSuperAdminUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
