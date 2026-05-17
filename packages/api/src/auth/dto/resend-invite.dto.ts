import { IsString } from 'class-validator';

export class ResendInviteDto {
  @IsString()
  userId: string;
}
