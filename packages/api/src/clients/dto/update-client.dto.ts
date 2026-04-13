import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';

export class UpdateClientDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;

  @IsOptional() @IsInt() @Min(1) serviceLimitCount?: number | null;
  @IsOptional() @IsIn(['day', 'week', 'month']) serviceLimitPeriod?: 'day' | 'week' | 'month' | null;

  @IsOptional() @IsBoolean() allProfessionals?: boolean;
  @IsOptional() @IsBoolean() allServices?: boolean;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) professionalIds?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) serviceIds?: string[];
}
