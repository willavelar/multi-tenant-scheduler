import { Module } from '@nestjs/common'
import { IntegrationConfigService } from './integration-config.service'
import { EncryptionModule } from '../encryption/encryption.module'

@Module({
  imports: [EncryptionModule],
  providers: [IntegrationConfigService],
  exports: [IntegrationConfigService],
})
export class IntegrationConfigModule {}
