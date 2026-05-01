// packages/api/src/email-queue/email-queue.producer.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const EMAIL_QUEUE = 'email';

export interface InviteJobData {
  to: string;
  inviteUrl: string;
}

@Injectable()
export class EmailQueueProducer {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly queue: Queue) {}

  async addInviteJob(data: InviteJobData): Promise<void> {
    await this.queue.add('send-invite', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}
