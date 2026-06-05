import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { SsoService } from './sso.service'
import { SsoController } from './sso.controller'
import { SuperAdminGuard } from '../../common/guards/super-admin.guard'
import { EncryptionModule } from '../../common/encryption/encryption.module'

@Module({
  imports: [
    EncryptionModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('SUPER_ADMIN_JWT_SECRET'),
      }),
    }),
  ],
  controllers: [SsoController],
  providers: [SsoService, SuperAdminGuard],
})
export class SsoModule {}
