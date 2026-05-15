import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../common/constants/password';

export class CreateAdminDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsBoolean()
  sendInvite?: boolean;

  @ValidateIf(o => !o.sendInvite)
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(200_000)
  avatarUrl?: string;
}
