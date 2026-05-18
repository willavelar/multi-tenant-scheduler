import { IsNotEmpty, IsNotIn, IsOptional, IsString, Matches } from 'class-validator';
import { RESERVED_SLUGS } from '../../common/constants/password';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message:
      'slug must be lowercase, only letters, numbers and hyphens, cannot start or end with a hyphen',
  })
  @IsNotIn(RESERVED_SLUGS, { message: "O slug 'app' é reservado pela plataforma" })
  slug?: string;
}
