import { Module } from '@nestjs/common'
import { SsoConfigService } from './sso-config.service'
import { EncryptionModule } from '../encryption/encryption.module'

@Module({
  imports: [EncryptionModule],
  providers: [SsoConfigService],
  exports: [SsoConfigService],
})
export class SsoConfigModule {}
