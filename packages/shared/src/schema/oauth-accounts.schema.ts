import { pgTable, uuid, text, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users.schema'

export const oauthProviderEnum = pgEnum('oauth_provider', ['google', 'microsoft', 'facebook'])

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id:             uuid('id').primaryKey().defaultRandom(),
    userId:         uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tenantId:       uuid('tenant_id'),
    provider:       oauthProviderEnum('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    providerEmail:  text('provider_email'),
    createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    providerUserTenantIdx: uniqueIndex('oauth_accounts_provider_user_tenant_idx')
      .on(t.provider, t.providerUserId, t.tenantId),
    userProviderIdx: uniqueIndex('oauth_accounts_user_provider_idx')
      .on(t.userId, t.provider),
  }),
)
