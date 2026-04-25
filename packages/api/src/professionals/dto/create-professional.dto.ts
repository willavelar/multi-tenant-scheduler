import { IsArray, IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleSlotDto {
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
  @IsOptional()
  slotDurationMinutes?: number;
}

export class CreateProfessionalDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200_000)
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsIn(['12h', '24h'])
  @IsOptional()
  timeFormat?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedule?: ScheduleSlotDto[];
}
