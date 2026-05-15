import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const NOTIFICATION_CLEANUP_QUEUE = 'notification-cleanup';

@Injectable()
export class NotificationCleanupProducer implements OnModuleInit {
  constructor(@InjectQueue(NOTIFICATION_CLEANUP_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.queue.add('run', {}, {
      repeat: { pattern: '0 3 * * *' },
      jobId: 'notification-cleanup-job',
    });
  }
}
