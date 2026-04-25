import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200_000)
  avatarUrl?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsIn(['12h', '24h'])
  @IsOptional()
  timeFormat?: string;
}
