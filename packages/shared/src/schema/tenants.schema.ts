import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const confirmationModeEnum = pgEnum('confirmation_mode', ['auto', 'manual']);
export const cancellationReasonModeEnum = pgEnum('cancellation_reason_mode', ['no', 'optional', 'required']);
export const cancellationDeadlineUnitEnum = pgEnum('cancellation_deadline_unit', ['minutes', 'hours', 'days']);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  logoDarkUrl: text('logo_dark_url'),
  confirmationMode: confirmationModeEnum('confirmation_mode').notNull().default('auto'),
  allowPaidStatus: boolean('allow_paid_status').notNull().default(true),
  cancellationReasonMode: cancellationReasonModeEnum('cancellation_reason_mode').notNull().default('no'),
  cancellationDeadlineValue: integer('cancellation_deadline_value'),
  cancellationDeadlineUnit: cancellationDeadlineUnitEnum('cancellation_deadline_unit'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
