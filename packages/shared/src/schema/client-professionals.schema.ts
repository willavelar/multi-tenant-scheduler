import { pgTable, unique, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';
import { clientProfiles } from './client-profiles.schema';
import { professionals } from './professionals.schema';

export const clientProfessionals = pgTable('client_professionals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientProfileId: uuid('client_profile_id').notNull().references(() => clientProfiles.id, { onDelete: 'cascade' }),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
}, (t) => ({
  uniq: unique().on(t.clientProfileId, t.professionalId),
}));

export type ClientProfessional = typeof clientProfessionals.$inferSelect;
