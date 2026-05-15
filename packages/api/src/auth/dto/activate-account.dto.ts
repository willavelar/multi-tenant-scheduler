import { IsString, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../../common/constants/password';

export class ActivateAccountDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  newPassword: string;
}
