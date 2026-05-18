import { pgEnum, pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.schema';
import { professionals } from './professionals.schema';
import { services } from './services.schema';
import { users } from './users.schema';

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending', 'confirmed', 'cancelled_by_client', 'cancelled_by_professional', 'completed',
]);

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  status: appointmentStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  // drizzle-kit <0.22 drops the .where() predicate in generated SQL — migration 0018 was patched manually
  noDoubleBooking: uniqueIndex('appointments_professional_starts_at_active_uniq')
    .on(t.professionalId, t.startsAt)
    .where(sql`status IN ('pending', 'confirmed')`),
}));

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
