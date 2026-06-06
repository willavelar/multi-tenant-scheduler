import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';
import { users } from './users.schema';

export const suggestionStatusEnum = pgEnum('suggestion_status', ['new', 'resolved']);

export const suggestions = pgTable('suggestions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  userName:  text('user_name').notNull(),
  userEmail: text('user_email').notNull(),
  content:   text('content').notNull(),
  imageUrl:  text('image_url'),
  status:    suggestionStatusEnum('status').notNull().default('new'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Suggestion = typeof suggestions.$inferSelect;
export type NewSuggestion = typeof suggestions.$inferInsert;
