// packages/api/src/email-queue/email-queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailModule } from '../email/email.module';
import { EMAIL_QUEUE, EmailQueueProducer } from './email-queue.producer';
import { EmailQueueProcessor } from './email-queue.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
    EmailModule,
  ],
  providers: [EmailQueueProducer, EmailQueueProcessor],
  exports: [EmailQueueProducer],
})
export class EmailQueueModule {}
