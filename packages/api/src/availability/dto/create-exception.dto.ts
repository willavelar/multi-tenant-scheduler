import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateExceptionDto {
  @IsUUID()
  professionalId: string;

  @IsString()
  date: string;

  @IsIn(['block', 'extra'])
  type: 'block' | 'extra';

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
