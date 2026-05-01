import { IsString } from 'class-validator';

export class ValidateInviteTokenDto {
  @IsString()
  token: string;
}
