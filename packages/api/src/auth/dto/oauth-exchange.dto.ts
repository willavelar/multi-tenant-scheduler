import { IsString, IsNotEmpty } from 'class-validator'

export class OAuthExchangeDto {
  @IsString()
  @IsNotEmpty()
  code!: string
}
