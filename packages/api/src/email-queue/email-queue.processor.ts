// packages/api/src/email-queue/email-queue.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from '../email/email.service';
import { EMAIL_QUEUE, InviteJobData, PasswordResetJobData, AppointmentNotificationJobData } from './email-queue.producer';

@Processor(EMAIL_QUEUE)
export class EmailQueueProcessor extends WorkerHost {
  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<InviteJobData | PasswordResetJobData | AppointmentNotificationJobData>): Promise<void> {
    if (job.name === 'send-invite') {
      const data = job.data as InviteJobData;
      await this.emailService.sendInvite(data.to, data.inviteUrl);
    } else if (job.name === 'send-password-reset') {
      const data = job.data as PasswordResetJobData;
      await this.emailService.sendPasswordReset(data.to, data.resetUrl);
    } else if (job.name === 'send-appointment-notification') {
      const data = job.data as AppointmentNotificationJobData;
      await this.emailService.sendAppointmentNotification(data.to, data.title, data.body);
    } else {
      throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
