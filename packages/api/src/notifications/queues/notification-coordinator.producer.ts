import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const NOTIFICATION_COORDINATOR_QUEUE = 'notification-coordinator';

export interface CoordinateNotificationJobData {
  appointmentId: string;
  tenantId:      string;
  actorUserId:   string;
  actorRole:     'client' | 'professional' | 'tenant_admin';
  event:         'appointment_created' | 'appointment_status_changed';
  newStatus?:    string;
}

@Injectable()
export class NotificationCoordinatorProducer {
  constructor(@InjectQueue(NOTIFICATION_COORDINATOR_QUEUE) private readonly queue: Queue) {}

  async add(data: CoordinateNotificationJobData): Promise<void> {
    await this.queue.add('coordinate', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}
