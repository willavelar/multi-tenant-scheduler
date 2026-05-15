import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const SYSTEM_NOTIFICATION_QUEUE = 'system-notification';

export interface SystemNotificationJobData {
  tenantId:    string;
  userId:      string;
  type:        'appointment_created' | 'appointment_status_changed';
  referenceId: string;
  title:       string;
  body:        string;
}

@Injectable()
export class SystemNotificationProducer {
  constructor(@InjectQueue(SYSTEM_NOTIFICATION_QUEUE) private readonly queue: Queue) {}

  async add(data: SystemNotificationJobData): Promise<void> {
    await this.queue.add('save-notification', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}
