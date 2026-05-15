import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { notifications } from '@scheduler/shared';
import { DB, DrizzleDB } from '../../database/database.module';
import { withTenant } from '../../database/with-tenant';
import { SYSTEM_NOTIFICATION_QUEUE, SystemNotificationJobData } from './system-notification.producer';

@Processor(SYSTEM_NOTIFICATION_QUEUE)
export class SystemNotificationProcessor extends WorkerHost {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {
    super();
  }

  async process(job: Job<SystemNotificationJobData>): Promise<void> {
    const { tenantId, userId, type, referenceId, title, body } = job.data;
    await withTenant(this.db, tenantId, async (tx) => {
      await tx.insert(notifications).values({ tenantId, userId, type, referenceId, title, body });
    });
  }
}
