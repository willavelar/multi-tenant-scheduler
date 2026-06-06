import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { SuggestionsService } from './suggestions.service';
import { SuggestionsController } from './suggestions.controller';
import { SuperAdminSuggestionsController } from './super-admin-suggestions.controller';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('SUPER_ADMIN_JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [SuggestionsController, SuperAdminSuggestionsController],
  providers: [SuggestionsService, SuperAdminGuard],
})
export class SuggestionsModule {}
