import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../common/constants/password';

export class CreateTenantDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  slug: string;

  @IsString()
  name: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  adminName: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  adminPassword: string;
}
