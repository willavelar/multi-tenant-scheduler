import { IsNotEmpty, IsNotIn, IsString, Matches } from 'class-validator';
import { RESERVED_SLUGS } from '../../common/constants/password';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message:
      'slug must be lowercase, only letters, numbers and hyphens, cannot start or end with a hyphen',
  })
  @IsNotIn(RESERVED_SLUGS, { message: "O slug 'app' é reservado pela plataforma" })
  slug: string;
}
