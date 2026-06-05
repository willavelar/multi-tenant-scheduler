import { NotFoundException, UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { OAuthService } from './oauth.service'
import { DB } from '../database/database.module'
import { REDIS } from '../redis/redis.module'
import { TenantsService } from '../tenants/tenants.service'
import { SsoConfigService } from '../common/sso-config/sso-config.service'

const QUERY_METHODS = [
  'select', 'from', 'where', 'innerJoin', 'leftJoin',
  'insert', 'values', 'returning', 'update', 'set', 'delete', 'limit',
]

function makeChain(thenImpl: (resolve: (v: unknown) => void) => void) {
  const chain: Record<string, unknown> = {}
  QUERY_METHODS.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain) })
  chain['then'] = jest.fn().mockImplementation(thenImpl)
  chain['execute'] = jest.fn().mockResolvedValue(undefined)
  return chain
}

function makeMockDb(chain: Record<string, unknown>) {
  const db: Record<string, unknown> = {}
  QUERY_METHODS.forEach((m) => { db[m] = jest.fn().mockReturnValue(chain) })
  db['execute'] = jest.fn().mockResolvedValue(undefined)
  db['transaction'] = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(chain))
  return db
}

function makeRedis(overrides: Record<string, jest.Mock> = {}) {
  return {
    get:    jest.fn().mockResolvedValue(null),
    set:    jest.fn().mockResolvedValue('OK'),
    del:    jest.fn().mockResolvedValue(1),
    getdel: jest.fn().mockResolvedValue(null),
    ...overrides,
  }
}

function makeSsoConfig(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    getConfig: jest.fn().mockResolvedValue(null),
    ...overrides,
  }
}

async function buildService(
  db: unknown,
  redis: unknown,
  tenantsService: Partial<TenantsService> = { resolveTenantId: jest.fn().mockResolvedValue(null) },
  ssoConfig: Partial<SsoConfigService> = makeSsoConfig(),
) {
  const module = await Test.createTestingModule({
    providers: [
      OAuthService,
      { provide: DB,              useValue: db },
      { provide: REDIS,           useValue: redis },
      { provide: ConfigService,   useValue: { get: jest.fn().mockReturnValue('mock-value') } },
      { provide: TenantsService,  useValue: tenantsService },
      { provide: SsoConfigService, useValue: ssoConfig },
    ],
  }).compile()
  return module.get(OAuthService)
}

// ── generateState / consumeState ──────────────────────────────────────────

describe('OAuthService state', () => {
  it('consumeState lança UnauthorizedException quando state não existe no Redis', async () => {
    const svc = await buildService(makeMockDb(makeChain((r) => r([]))), makeRedis())
    await expect(svc.consumeState('invalid-id')).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('consumeState retorna dados quando state existe', async () => {
    const data = { slug: 'clinic', mode: 'login', returnTo: '/appointments' }
    const redis = makeRedis({ getdel: jest.fn().mockResolvedValue(JSON.stringify(data)) })
    const svc = await buildService(makeMockDb(makeChain((r) => r([]))), redis)
    const result = await svc.consumeState('valid-id')
    expect(result.slug).toBe('clinic')
    expect(result.mode).toBe('login')
  })
})

// ── savePendingSSO / readPendingSSO / consumePendingSSO ───────────────────

describe('OAuthService pending SSO', () => {
  it('readPendingSSO lança NotFoundException quando código não existe', async () => {
    const svc = await buildService(makeMockDb(makeChain((r) => r([]))), makeRedis())
    await expect(svc.readPendingSSO('nonexistent')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('consumePendingSSO lança NotFoundException quando código não existe', async () => {
    const svc = await buildService(makeMockDb(makeChain((r) => r([]))), makeRedis())
    await expect(svc.consumePendingSSO('nonexistent')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('readPendingSSO retorna dados sem consumir', async () => {
    const pending = { provider: 'google', providerUserId: '123', providerEmail: 'a@b.com', name: 'Ana', email: 'a@b.com' }
    const redis = makeRedis({ get: jest.fn().mockResolvedValue(JSON.stringify(pending)) })
    const svc = await buildService(makeMockDb(makeChain((r) => r([]))), redis)
    const result = await svc.readPendingSSO('code')
    expect(result.provider).toBe('google')
    expect(result.email).toBe('a@b.com')
    expect(redis.getdel).not.toHaveBeenCalled()
  })
})

// ── consumeExchangeCode ────────────────────────────────────────────────────

describe('OAuthService exchange code', () => {
  it('consumeExchangeCode lança UnauthorizedException quando código expirado', async () => {
    const svc = await buildService(makeMockDb(makeChain((r) => r([]))), makeRedis())
    await expect(svc.consumeExchangeCode('expired')).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('consumeExchangeCode retorna userId e tenantId', async () => {
    const payload = { userId: 'u1', tenantId: 't1' }
    const redis = makeRedis({ getdel: jest.fn().mockResolvedValue(JSON.stringify(payload)) })
    const svc = await buildService(makeMockDb(makeChain((r) => r([]))), redis)
    const result = await svc.consumeExchangeCode('code')
    expect(result.userId).toBe('u1')
    expect(result.tenantId).toBe('t1')
  })
})

// ── resolveTenantId ────────────────────────────────────────────────────────

describe('OAuthService.resolveTenantId', () => {
  it('lança NotFoundException quando TenantsService retorna null', async () => {
    const tenantsSvc = { resolveTenantId: jest.fn().mockResolvedValue(null) }
    const svc = await buildService(makeMockDb(makeChain((r) => r([]))), makeRedis(), tenantsSvc)
    await expect(svc.resolveTenantId('unknown')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('retorna tenantId quando TenantsService resolve o slug', async () => {
    const tenantsSvc = { resolveTenantId: jest.fn().mockResolvedValue({ id: 'tenant-uuid', active: true }) }
    const svc = await buildService(makeMockDb(makeChain((r) => r([]))), makeRedis(), tenantsSvc)
    const id = await svc.resolveTenantId('clinic')
    expect(id).toBe('tenant-uuid')
    expect(tenantsSvc.resolveTenantId).toHaveBeenCalledWith('clinic')
  })
})

// ── getAuthorizationUrl ────────────────────────────────────────────────────

describe('OAuthService.getAuthorizationUrl', () => {
  async function buildWithSsoConfig(credentials: Record<string, { clientId: string; clientSecret: string } | null>) {
    const ssoConfig = makeSsoConfig({
      getConfig: jest.fn().mockImplementation((provider: string) =>
        Promise.resolve(credentials[provider] ?? null),
      ),
    })
    const module = await Test.createTestingModule({
      providers: [
        OAuthService,
        { provide: DB,             useValue: {} },
        { provide: REDIS,          useValue: {} },
        { provide: TenantsService, useValue: { resolveTenantId: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => ({
              OAUTH_CALLBACK_BASE_URL: 'https://api.example.com',
            }[key] ?? '')),
          },
        },
        { provide: SsoConfigService, useValue: ssoConfig },
      ],
    }).compile()
    return module.get(OAuthService)
  }

  it('gera URL do Google com client_id e state corretos', async () => {
    const svc = await buildWithSsoConfig({ google: { clientId: 'gid', clientSecret: 'gsec' } })
    const url = await svc.getAuthorizationUrl('google', 'state123')
    expect(url).toContain('accounts.google.com')
    expect(url).toContain('client_id=gid')
    expect(url).toContain('state=state123')
  })

  it('gera URL da Microsoft com client_id e state corretos', async () => {
    const svc = await buildWithSsoConfig({ microsoft: { clientId: 'mid', clientSecret: 'msec' } })
    const url = await svc.getAuthorizationUrl('microsoft', 'state456')
    expect(url).toContain('login.microsoftonline.com')
    expect(url).toContain('client_id=mid')
  })

  it('gera URL do Facebook com client_id correto', async () => {
    const svc = await buildWithSsoConfig({ facebook: { clientId: 'fid', clientSecret: 'fsec' } })
    const url = await svc.getAuthorizationUrl('facebook', 'state789')
    expect(url).toContain('facebook.com')
    expect(url).toContain('client_id=fid')
  })

  it('lança erro quando provider não está configurado', async () => {
    const svc = await buildWithSsoConfig({ google: null })
    await expect(svc.getAuthorizationUrl('google', 'state')).rejects.toThrow('google_not_configured')
  })
})
