import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { RedisModule } from '../redis/redis.module';
import { SsoModule } from './sso/sso.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('SUPER_ADMIN_JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
    RedisModule,
    SsoModule,
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, SuperAdminGuard],
})
export class SuperAdminModule {}
