import { integer, pgTable, unique, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';
import { clientProfiles, serviceLimitPeriodEnum } from './client-profiles.schema';
import { services } from './services.schema';

export const clientServiceLimits = pgTable('client_service_limits', {
  id:              uuid('id').primaryKey().defaultRandom(),
  tenantId:        uuid('tenant_id').notNull().references(() => tenants.id,         { onDelete: 'cascade' }),
  clientProfileId: uuid('client_profile_id').notNull().references(() => clientProfiles.id, { onDelete: 'cascade' }),
  serviceId:       uuid('service_id').notNull().references(() => services.id,       { onDelete: 'cascade' }),
  limitCount:      integer('limit_count').notNull(),
  limitPeriod:     serviceLimitPeriodEnum('limit_period').notNull(),
}, (t) => ({
  uniq: unique().on(t.clientProfileId, t.serviceId),
}));

export type ClientServiceLimit = typeof clientServiceLimits.$inferSelect;
export type NewClientServiceLimit = typeof clientServiceLimits.$inferInsert;
