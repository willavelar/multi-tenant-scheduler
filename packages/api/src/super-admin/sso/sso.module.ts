import { Module } from '@nestjs/common'
import { SsoService } from './sso.service'
import { SsoController } from './sso.controller'
import { EncryptionModule } from '../../common/encryption/encryption.module'

@Module({
  imports: [EncryptionModule],
  controllers: [SsoController],
  providers: [SsoService],
})
export class SsoModule {}
