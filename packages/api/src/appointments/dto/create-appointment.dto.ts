import { IsString, IsUUID, Matches } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  professionalId: string;

  @IsUUID()
  serviceId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string; // "YYYY-MM-DD"

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime: string; // "HH:MM"
}
