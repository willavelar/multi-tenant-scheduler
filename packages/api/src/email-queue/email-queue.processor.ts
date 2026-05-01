// packages/api/src/email-queue/email-queue.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from '../email/email.service';
import { EMAIL_QUEUE, InviteJobData } from './email-queue.producer';

@Processor(EMAIL_QUEUE)
export class EmailQueueProcessor extends WorkerHost {
  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<InviteJobData>): Promise<void> {
    if (job.name === 'send-invite') {
      await this.emailService.sendInvite(job.data.to, job.data.inviteUrl);
    } else {
      throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
