import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../common/constants/password';
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

  @IsOptional()
  @IsBoolean()
  sendInvite?: boolean;

  @ValidateIf(o => !o.sendInvite)
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
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

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedule?: ScheduleSlotDto[];
}
