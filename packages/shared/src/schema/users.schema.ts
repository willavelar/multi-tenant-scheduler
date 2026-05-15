import { boolean, pgEnum, pgTable, text, timestamp, uuid, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';

export const roleEnum = pgEnum('user_role', ['super_admin', 'tenant_admin', 'professional', 'client']);

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  email:        text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role:         roleEnum('role').notNull(),
  name:         text('name').notNull(),
  phone:        text('phone'),
  active:       boolean('active').notNull().default(true),
  avatarUrl:    text('avatar_url'),
  timezone:          text('timezone').notNull().default('America/Sao_Paulo'),
  timeFormat:        text('time_format').notNull().default('24h'),
  notifyViaSystem:   boolean('notify_via_system').notNull().default(true),
  notifyViaEmail:    boolean('notify_via_email').notNull().default(false),
  notifyViaWhatsapp: boolean('notify_via_whatsapp').notNull().default(false),
  lastLoginAt:       timestamp('last_login_at'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueEmailPerTenant: unique('users_tenant_email_unique').on(table.tenantId, table.email),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
