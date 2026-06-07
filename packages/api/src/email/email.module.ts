import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { IntegrationConfigModule } from '../common/integrations/integration-config.module';

@Module({
  imports: [IntegrationConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
