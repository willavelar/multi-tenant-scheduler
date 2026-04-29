import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const confirmationModeEnum = pgEnum('confirmation_mode', ['auto', 'manual']);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  confirmationMode: confirmationModeEnum('confirmation_mode').notNull().default('auto'),
  allowPaidStatus: boolean('allow_paid_status').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
