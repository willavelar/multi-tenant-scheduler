import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpsertSsoDto {
  @IsBoolean()
  enabled: boolean

  @IsOptional()
  @IsString()
  clientId?: string

  @IsOptional()
  @IsString()
  clientSecret?: string
}
