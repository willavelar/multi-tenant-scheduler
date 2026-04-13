import { pgTable, unique, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';
import { clientProfiles } from './client-profiles.schema';
import { services } from './services.schema';

export const clientServices = pgTable('client_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientProfileId: uuid('client_profile_id').notNull().references(() => clientProfiles.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
}, (t) => ({
  uniq: unique().on(t.clientProfileId, t.serviceId),
}));

export type ClientService = typeof clientServices.$inferSelect;
