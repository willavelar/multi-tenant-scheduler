import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';
import { users } from './users.schema';

export const notificationTypeEnum = pgEnum('notification_type', [
  'appointment_created',
  'appointment_status_changed',
]);

export const notifications = pgTable('notifications', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:        notificationTypeEnum('type').notNull(),
  referenceId: uuid('reference_id').notNull(),
  title:       text('title').notNull(),
  body:        text('body').notNull(),
  readAt:      timestamp('read_at'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
