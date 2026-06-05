import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { OAuthController } from './oauth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { EmailQueueModule } from '../email-queue/email-queue.module';
import { TenantsModule } from '../tenants/tenants.module';
import { SsoConfigModule } from '../common/sso-config/sso-config.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    EmailQueueModule,
    TenantsModule,
    SsoConfigModule,
  ],
  providers: [AuthService, OAuthService, JwtStrategy, LocalStrategy],
  controllers: [AuthController, OAuthController],
  exports: [AuthService],
})
export class AuthModule {}
