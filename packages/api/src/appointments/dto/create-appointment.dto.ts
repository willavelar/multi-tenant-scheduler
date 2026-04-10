import { IsString, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  professionalId: string;

  @IsUUID()
  serviceId: string;

  @IsString()
  date: string; // "YYYY-MM-DD"

  @IsString()
  startTime: string; // "HH:MM"
}
