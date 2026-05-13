import { boolean, date, integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';
import { users } from './users.schema';

export const serviceLimitPeriodEnum = pgEnum('service_limit_period', ['day', 'week', 'month']);

export const clientProfiles = pgTable('client_profiles', {
  id:                       uuid('id').primaryKey().defaultRandom(),
  tenantId:                 uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId:                   uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  birthDate:                date('birth_date'),
  notes:                    text('notes'),
  allProfessionals:         boolean('all_professionals').notNull().default(false),
  allServices:              boolean('all_services').notNull().default(false),
  serviceLimitCount:        integer('service_limit_count'),
  serviceLimitPeriod:       serviceLimitPeriodEnum('service_limit_period'),
  cancellationLimitCount:   integer('cancellation_limit_count'),
  cancellationLimitPeriod:  serviceLimitPeriodEnum('cancellation_limit_period'),
});

export type ClientProfile = typeof clientProfiles.$inferSelect;
export type NewClientProfile = typeof clientProfiles.$inferInsert;
