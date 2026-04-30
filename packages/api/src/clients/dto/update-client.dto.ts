import {
  IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID,
  Matches, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceLimitItemDto } from './service-limit-item.dto';

export class UpdateClientDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @MaxLength(200_000) avatarUrl?: string;

  @IsOptional() @IsInt() @Min(1) serviceLimitCount?: number | null;
  @IsOptional() @IsIn(['day', 'week', 'month']) serviceLimitPeriod?: 'day' | 'week' | 'month' | null;

  @IsOptional() @IsBoolean() allProfessionals?: boolean;
  @IsOptional() @IsBoolean() allServices?: boolean;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) professionalIds?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) serviceIds?: string[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ServiceLimitItemDto)
  serviceLimits?: ServiceLimitItemDto[];

  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() @IsIn(['12h', '24h']) timeFormat?: string;
}
