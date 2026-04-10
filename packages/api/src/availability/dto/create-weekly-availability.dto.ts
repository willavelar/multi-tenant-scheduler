import { IsInt, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateWeeklyAvailabilityDto {
  @IsUUID()
  professionalId: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsInt()
  @Min(15)
  slotDurationMinutes: number;
}
