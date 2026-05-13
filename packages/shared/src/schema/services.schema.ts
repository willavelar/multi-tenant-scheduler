import { boolean, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  description: text('description'),
  active: boolean('active').notNull().default(true),
  color: text('color').notNull().default('#6366f1'),
});

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
