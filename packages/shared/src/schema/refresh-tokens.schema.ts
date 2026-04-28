import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const refreshTokens = pgTable('refresh_tokens', {
  id:            uuid('id').primaryKey().defaultRandom(),
  tokenHash:     text('token_hash').notNull().unique(),
  userId:        uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId:      uuid('tenant_id'),
  expiresAt:     timestamp('expires_at').notNull(),
  revokedAt:     timestamp('revoked_at'),
  replacedById:  uuid('replaced_by_id'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
});
