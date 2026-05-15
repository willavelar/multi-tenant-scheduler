import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { notifications } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { CoordinateNotificationJobData, NotificationCoordinatorProducer } from './queues/notification-coordinator.producer';

const THIRTY_DAYS = sql`NOW() - INTERVAL '30 days'`;

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly coordinatorProducer: NotificationCoordinatorProducer,
  ) {}

  async dispatch(data: CoordinateNotificationJobData): Promise<void> {
    await this.coordinatorProducer.add(data);
  }

  async findAll(userId: string, tenantId: string, page: number, limit: number, unreadOnly: boolean) {
    const offset = (page - 1) * limit;
    return withTenant(this.db, tenantId, async (tx) => {
      const where = and(
        eq(notifications.userId,   userId),
        eq(notifications.tenantId, tenantId),
        lt(notifications.createdAt, sql`NOW()`),
        sql`${notifications.createdAt} >= ${THIRTY_DAYS}`,
        unreadOnly ? isNull(notifications.readAt) : undefined,
      );
      const [{ total }] = await tx.select({ total: count() }).from(notifications).where(where);
      const data = await tx
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);
      return { data, total, page, limit };
    });
  }

  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    return withTenant(this.db, tenantId, async (tx) => {
      const [{ total }] = await tx
        .select({ total: count() })
        .from(notifications)
        .where(and(
          eq(notifications.userId,   userId),
          eq(notifications.tenantId, tenantId),
          isNull(notifications.readAt),
          sql`${notifications.createdAt} >= ${THIRTY_DAYS}`,
        ));
      return Number(total);
    });
  }

  async markAllRead(userId: string, tenantId: string): Promise<void> {
    await withTenant(this.db, tenantId, async (tx) => {
      await tx
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(
          eq(notifications.userId,   userId),
          eq(notifications.tenantId, tenantId),
          isNull(notifications.readAt),
        ));
    });
  }
}
