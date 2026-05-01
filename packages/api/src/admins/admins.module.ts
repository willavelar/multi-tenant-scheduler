import { Module } from '@nestjs/common';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';
import { EmailQueueModule } from '../email-queue/email-queue.module';

@Module({
  imports: [EmailQueueModule],
  controllers: [AdminsController],
  providers: [AdminsService],
})
export class AdminsModule {}
