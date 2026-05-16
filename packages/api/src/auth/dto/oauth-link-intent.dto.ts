import { IsString, IsIn, IsOptional } from 'class-validator'

export class OAuthLinkIntentDto {
  @IsString()
  @IsIn(['google', 'microsoft', 'facebook'])
  provider!: string

  @IsString()
  @IsOptional()
  returnTo?: string
}
