import { IsString, MinLength } from 'class-validator';

export class ActivateAccountDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
