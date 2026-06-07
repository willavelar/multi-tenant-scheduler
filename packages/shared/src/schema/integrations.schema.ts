import { boolean, jsonb, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const integrationKeyEnum = pgEnum('integration_key', ['whatsapp', 'email'])

export const integrations = pgTable('integrations', {
  key:       integrationKeyEnum('key').primaryKey(),
  enabled:   boolean('enabled').notNull().default(false),
  config:    jsonb('config').$type<Record<string, string>>().notNull().default({}),
  secretEnc: text('secret_enc'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Integration = typeof integrations.$inferSelect
export type NewIntegration = typeof integrations.$inferInsert
