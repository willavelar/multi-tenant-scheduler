import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { IntegrationsService } from './integrations.service'
import { IntegrationsController } from './integrations.controller'
import { EncryptionModule } from '../../common/encryption/encryption.module'
import { SuperAdminGuard } from '../../common/guards/super-admin.guard'

@Module({
  imports: [
    EncryptionModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('SUPER_ADMIN_JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, SuperAdminGuard],
})
export class IntegrationsModule {}
