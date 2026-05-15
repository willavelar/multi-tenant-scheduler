import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../../common/constants/password';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
