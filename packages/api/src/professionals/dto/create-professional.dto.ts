import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProfessionalDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
