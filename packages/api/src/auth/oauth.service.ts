import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomBytes } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { oauthAccounts, users } from '@scheduler/shared'
import type Redis from 'ioredis'
import { DB, DrizzleDB } from '../database/database.module'
import { REDIS } from '../redis/redis.module'
import { withTenant } from '../database/with-tenant'
import { TenantsService } from '../tenants/tenants.service'

export type OAuthProvider = 'google' | 'microsoft' | 'facebook'

const VALID_PROVIDERS: OAuthProvider[] = ['google', 'microsoft', 'facebook']

export function isValidProvider(p: string): p is OAuthProvider {
  return VALID_PROVIDERS.includes(p as OAuthProvider)
}

interface OAuthStateData {
  slug:     string
  mode:     'login' | 'link'
  returnTo: string
  userId?:  string
}

interface PendingSSO {
  provider:       OAuthProvider
  providerUserId: string
  providerEmail:  string | null
  name:           string
  email:          string
}

export interface OAuthProfile {
  provider:       OAuthProvider
  providerUserId: string
  providerEmail:  string | null
  email:          string | null
  emailVerified:  boolean
  name:           string
}

const STATE_TTL    = 600  // 10 min
const PENDING_TTL  = 600  // 10 min
const EXCHANGE_TTL = 120  // 2 min

@Injectable()
export class OAuthService {
  constructor(
    @Inject(DB)    private readonly db: DrizzleDB,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly tenantsService: TenantsService,
  ) {}

  // ── Redis: state ─────────────────────────────────────────────────────────

  async generateState(slug: string, mode: 'login' | 'link', extra: { returnTo?: string; userId?: string } = {}): Promise<string> {
    const id = randomBytes(24).toString('hex')
    const data: OAuthStateData = { slug, mode, returnTo: extra.returnTo ?? '/appointments', userId: extra.userId }
    await this.redis.set(`oauth:state:${id}`, JSON.stringify(data), 'EX', STATE_TTL)
    return id
  }

  async consumeState(id: string): Promise<OAuthStateData> {
    const raw = await this.redis.getdel(`oauth:state:${id}`)
    if (!raw) throw new UnauthorizedException('OAuth state expired or invalid')
    return JSON.parse(raw) as OAuthStateData
  }

  // ── Redis: pending SSO (register pre-fill) ────────────────────────────────

  async savePendingSSO(data: PendingSSO): Promise<string> {
    const id = randomBytes(24).toString('hex')
    await this.redis.set(`oauth:pending:${id}`, JSON.stringify(data), 'EX', PENDING_TTL)
    return id
  }

  async readPendingSSO(id: string): Promise<PendingSSO> {
    const raw = await this.redis.get(`oauth:pending:${id}`)
    if (!raw) throw new NotFoundException('SSO pending code expired or invalid')
    return JSON.parse(raw) as PendingSSO
  }

  async consumePendingSSO(id: string): Promise<PendingSSO> {
    const raw = await this.redis.getdel(`oauth:pending:${id}`)
    if (!raw) throw new NotFoundException('SSO pending code expired or invalid')
    return JSON.parse(raw) as PendingSSO
  }

  // ── Redis: exchange code ──────────────────────────────────────────────────

  async generateExchangeCode(userId: string, tenantId: string): Promise<string> {
    const id = randomBytes(24).toString('hex')
    await this.redis.set(`oauth:exchange:${id}`, JSON.stringify({ userId, tenantId }), 'EX', EXCHANGE_TTL)
    return id
  }

  async consumeExchangeCode(id: string): Promise<{ userId: string; tenantId: string }> {
    const raw = await this.redis.getdel(`oauth:exchange:${id}`)
    if (!raw) throw new UnauthorizedException('Exchange code expired or already used')
    return JSON.parse(raw) as { userId: string; tenantId: string }
  }

  // ── Provider helpers ──────────────────────────────────────────────────────

  getAuthorizationUrl(provider: OAuthProvider, stateId: string): string {
    const base = this.config.get<string>('OAUTH_CALLBACK_BASE_URL') ?? 'http://localhost:3001'
    const redirectUri = `${base}/auth/oauth/${provider}/callback`

    switch (provider) {
      case 'google': {
        const p = new URLSearchParams({
          client_id:     this.config.get<string>('GOOGLE_CLIENT_ID')!,
          redirect_uri:  redirectUri,
          response_type: 'code',
          scope:         'openid email profile',
          state:         stateId,
          access_type:   'online',
        })
        return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
      }
      case 'microsoft': {
        const p = new URLSearchParams({
          client_id:     this.config.get<string>('MICROSOFT_CLIENT_ID')!,
          redirect_uri:  redirectUri,
          response_type: 'code',
          scope:         'openid email profile',
          state:         stateId,
          response_mode: 'query',
        })
        return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${p}`
      }
      case 'facebook': {
        const p = new URLSearchParams({
          client_id:     this.config.get<string>('FACEBOOK_CLIENT_ID')!,
          redirect_uri:  redirectUri,
          response_type: 'code',
          scope:         'email',
          state:         stateId,
        })
        return `https://www.facebook.com/v18.0/dialog/oauth?${p}`
      }
    }
  }

  async exchangeCodeForProfile(provider: OAuthProvider, code: string): Promise<OAuthProfile> {
    const base       = this.config.get<string>('OAUTH_CALLBACK_BASE_URL') ?? 'http://localhost:3001'
    const redirectUri = `${base}/auth/oauth/${provider}/callback`

    switch (provider) {
      case 'google':    return this.exchangeGoogle(code, redirectUri)
      case 'microsoft': return this.exchangeMicrosoft(code, redirectUri)
      case 'facebook':  return this.exchangeFacebook(code, redirectUri)
    }
  }

  private async exchangeGoogle(code: string, redirectUri: string): Promise<OAuthProfile> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     this.config.get<string>('GOOGLE_CLIENT_ID')!,
        client_secret: this.config.get<string>('GOOGLE_CLIENT_SECRET')!,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    })
    if (!tokenRes.ok) throw new Error('google_token_exchange_failed')
    const { access_token } = await tokenRes.json() as { access_token: string }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    if (!userRes.ok) throw new Error('google_userinfo_failed')
    const u = await userRes.json() as { sub: string; email?: string; email_verified?: boolean; name?: string }

    return {
      provider:       'google',
      providerUserId: u.sub,
      providerEmail:  u.email ?? null,
      email:          u.email ?? null,
      emailVerified:  !!u.email_verified,
      name:           u.name ?? u.email ?? 'User',
    }
  }

  private async exchangeMicrosoft(code: string, redirectUri: string): Promise<OAuthProfile> {
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     this.config.get<string>('MICROSOFT_CLIENT_ID')!,
        client_secret: this.config.get<string>('MICROSOFT_CLIENT_SECRET')!,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
        scope:         'openid email profile',
      }),
    })
    if (!tokenRes.ok) throw new Error('microsoft_token_exchange_failed')
    const { access_token } = await tokenRes.json() as { access_token: string }

    const userRes = await fetch(
      'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName',
      { headers: { Authorization: `Bearer ${access_token}` } },
    )
    if (!userRes.ok) throw new Error('microsoft_userinfo_failed')
    const u = await userRes.json() as { id: string; displayName?: string; mail?: string; userPrincipalName?: string }

    const email = u.mail ?? u.userPrincipalName ?? null
    return {
      provider:       'microsoft',
      providerUserId: u.id,
      providerEmail:  email,
      email,
      emailVerified:  true,
      name:           u.displayName ?? email ?? 'User',
    }
  }

  private async exchangeFacebook(code: string, redirectUri: string): Promise<OAuthProfile> {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({
        code,
        client_id:     this.config.get<string>('FACEBOOK_CLIENT_ID')!,
        client_secret: this.config.get<string>('FACEBOOK_CLIENT_SECRET')!,
        redirect_uri:  redirectUri,
      }),
    )
    if (!tokenRes.ok) throw new Error('facebook_token_exchange_failed')
    const { access_token } = await tokenRes.json() as { access_token: string }

    const userRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${access_token}`,
    )
    if (!userRes.ok) throw new Error('facebook_userinfo_failed')
    const u = await userRes.json() as { id: string; name?: string; email?: string }

    return {
      provider:       'facebook',
      providerUserId: u.id,
      providerEmail:  u.email ?? null,
      email:          u.email ?? null,
      emailVerified:  !!u.email,
      name:           u.name ?? u.email ?? 'User',
    }
  }

  // ── DB operations ─────────────────────────────────────────────────────────

  async resolveTenantId(slug: string): Promise<string> {
    // Delegates to TenantsService which caches in Redis (TTL 3600s), avoiding
    // repeated DB queries on every OAuth callback for the same tenant.
    const tenantId = await this.tenantsService.resolveTenantId(slug)
    if (!tenantId) throw new NotFoundException(`Tenant '${slug}' not found`)
    return tenantId
  }

  /** Returns the user if found/linked, null if new user must register. */
  async findOrLinkUser(tenantId: string, profile: OAuthProfile): Promise<typeof users.$inferSelect | null> {
    if (!profile.email) return null

    return withTenant(this.db, tenantId, async (tx) => {
      // Case A: oauth_accounts already exists
      const [linked] = await tx
        .select()
        .from(oauthAccounts)
        .where(and(
          eq(oauthAccounts.provider, profile.provider),
          eq(oauthAccounts.providerUserId, profile.providerUserId),
          eq(oauthAccounts.tenantId, tenantId),
        ))

      if (linked) {
        const [user] = await tx.select().from(users)
          .where(and(eq(users.id, linked.userId), eq(users.tenantId, tenantId)))
        return user ?? null
      }

      // Case B: user exists by email — silently link
      const [user] = await tx.select().from(users)
        .where(and(eq(users.email, profile.email!), eq(users.tenantId, tenantId)))

      if (user) {
        await tx.insert(oauthAccounts).values({
          userId:         user.id,
          tenantId,
          provider:       profile.provider,
          providerUserId: profile.providerUserId,
          providerEmail:  profile.providerEmail,
        })
        return user
      }

      return null  // Case C: redirect to register
    })
  }

  async linkProvider(userId: string, tenantId: string, profile: OAuthProfile): Promise<void> {
    await withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ userId: oauthAccounts.userId })
        .from(oauthAccounts)
        .where(and(
          eq(oauthAccounts.provider, profile.provider),
          eq(oauthAccounts.providerUserId, profile.providerUserId),
        ))

      if (existing && existing.userId !== userId) throw new BadRequestException('already_linked_to_another_user')
      if (existing) return  // idempotent

      await tx.insert(oauthAccounts).values({
        userId,
        tenantId,
        provider:       profile.provider,
        providerUserId: profile.providerUserId,
        providerEmail:  profile.providerEmail,
      })
    })
  }

  async linkPendingSSO(userId: string, tenantId: string, ssoCode: string): Promise<void> {
    const pending = await this.consumePendingSSO(ssoCode)
    await withTenant(this.db, tenantId, (tx) =>
      tx.insert(oauthAccounts).values({
        userId,
        tenantId,
        provider:       pending.provider,
        providerUserId: pending.providerUserId,
        providerEmail:  pending.providerEmail,
      }),
    )
  }

  async unlinkProvider(userId: string, tenantId: string, provider: OAuthProvider): Promise<void> {
    await withTenant(this.db, tenantId, (tx) =>
      tx.delete(oauthAccounts).where(and(
        eq(oauthAccounts.userId, userId),
        eq(oauthAccounts.tenantId, tenantId),
        eq(oauthAccounts.provider, provider),
      )),
    )
  }

  async listLinkedProviders(userId: string, tenantId: string) {
    return withTenant(this.db, tenantId, (tx) =>
      tx
        .select({
          provider:      oauthAccounts.provider,
          providerEmail: oauthAccounts.providerEmail,
          createdAt:     oauthAccounts.createdAt,
        })
        .from(oauthAccounts)
        .where(and(
          eq(oauthAccounts.userId, userId),
          eq(oauthAccounts.tenantId, tenantId),
        )),
    )
  }
}
