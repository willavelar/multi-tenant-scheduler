import { boolean, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const ssoProviderEnum = pgEnum('sso_provider', ['google', 'microsoft', 'facebook'])

export const ssoProviders = pgTable('sso_providers', {
  provider:        ssoProviderEnum('provider').primaryKey(),
  enabled:         boolean('enabled').notNull().default(false),
  clientId:        text('client_id'),
  clientSecretEnc: text('client_secret_enc'),
  updatedAt:       timestamp('updated_at').notNull().defaultNow(),
})

export type SsoProvider = typeof ssoProviders.$inferSelect
export type NewSsoProvider = typeof ssoProviders.$inferInsert
