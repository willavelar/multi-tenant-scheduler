import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { EmailQueueModule } from '../email-queue/email-queue.module';

@Module({
  imports: [EmailQueueModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
