import { IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

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

  @IsOptional()
  @IsUUID()
  clientId?: string; // admin/professional can specify the client

  @IsOptional()
  @IsIn(['pending', 'confirmed'])
  initialStatus?: 'pending' | 'confirmed'; // admin/professional override in manual mode
}
