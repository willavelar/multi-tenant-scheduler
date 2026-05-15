import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { and, eq, lt, sql } from 'drizzle-orm';
import { notifications, tenants } from '@scheduler/shared';
import { DB, DrizzleDB } from '../../database/database.module';
import { withTenant } from '../../database/with-tenant';
import { NOTIFICATION_CLEANUP_QUEUE } from './notification-cleanup.producer';

@Processor(NOTIFICATION_CLEANUP_QUEUE)
export class NotificationCleanupProcessor extends WorkerHost {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const allTenants = await this.db.select({ id: tenants.id }).from(tenants);
    for (const { id: tenantId } of allTenants) {
      await withTenant(this.db, tenantId, async (tx) => {
        await tx
          .delete(notifications)
          .where(and(
            eq(notifications.tenantId, tenantId),
            lt(notifications.createdAt, sql`NOW() - INTERVAL '30 days'`),
          ));
      });
    }
  }
}
