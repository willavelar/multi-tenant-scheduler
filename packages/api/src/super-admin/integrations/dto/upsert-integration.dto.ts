import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpsertIntegrationDto {
  @IsBoolean()
  enabled: boolean

  // whatsapp
  @IsOptional() @IsString() accountSid?: string
  @IsOptional() @IsString() authToken?: string
  @IsOptional() @IsString() whatsappFrom?: string

  // email
  @IsOptional() @IsString() fromEmail?: string
  @IsOptional() @IsString() apiKey?: string
}
