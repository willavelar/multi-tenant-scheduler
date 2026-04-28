# Refresh Token Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the refresh token lifecycle: DB persistence, token rotation with replay detection, a `/auth/refresh` endpoint, and a hybrid proactive+reactive refresh on the frontend.

**Architecture:** A `refresh_tokens` table (no RLS — auth infrastructure, not tenant data) stores SHA-256 hashes of refresh JWTs. Each use issues a new pair and marks the old token revoked with a `replacedById` pointer; replaying a revoked token revokes the whole descendant chain. The frontend runs a proactive timer (1 min before expiry) plus a reactive 401 interceptor with request deduplication as a fallback.

**Tech Stack:** NestJS + Drizzle (node-postgres) on the backend; React + `jwtDecode` + native `fetch` on the frontend. No new libraries.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `packages/shared/src/schema/refresh-tokens.schema.ts` | **Create** | Drizzle table definition |
| `packages/shared/src/schema/index.ts` | **Modify** | Export new schema |
| `packages/api/src/auth/auth.service.ts` | **Modify** | Token persistence, refresh, logout, revoke chain |
| `packages/api/src/auth/auth.controller.ts` | **Modify** | `/auth/refresh` and `/auth/logout` endpoints |
| `packages/api/src/auth/auth.service.spec.ts` | **Modify** | Tests for new service methods |
| `packages/web/src/lib/api.ts` | **Modify** | `setOnSessionExpired`, `attemptRefresh`, 401 interceptor |
| `packages/web/src/providers/AuthProvider.tsx` | **Modify** | Proactive timer, event listener, updated logout |

---

## Task 1: DB Schema — `refresh_tokens` table

**Files:**
- Create: `packages/shared/src/schema/refresh-tokens.schema.ts`
- Modify: `packages/shared/src/schema/index.ts`

- [ ] **Step 1: Create the Drizzle schema**

Create `packages/shared/src/schema/refresh-tokens.schema.ts`:

```typescript
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
```

Note: `replacedById` has no `.references()` to avoid a circular FK. We handle the chain link in application code.

- [ ] **Step 2: Export from the shared schema index**

Open `packages/shared/src/schema/index.ts` and add this export alongside the others:

```typescript
export * from './refresh-tokens.schema';
```

- [ ] **Step 3: Rebuild shared and generate migration**

```bash
cd packages/shared && pnpm build && cd ../..
pnpm db:generate
```

Expected: a new SQL migration file in `packages/api/drizzle/` containing `CREATE TABLE refresh_tokens`.

- [ ] **Step 4: Apply migration (requires DB to be running)**

```bash
pnpm db:migrate
```

Expected: `✓ migrations applied` (or equivalent Drizzle output). If the DB is not running, start it first: `docker compose up -d db`.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schema/refresh-tokens.schema.ts packages/shared/src/schema/index.ts packages/api/drizzle/
git commit -m "feat(db): add refresh_tokens table"
```

---

## Task 2: Backend — Token persistence in `generateTokens`

**Files:**
- Modify: `packages/api/src/auth/auth.service.ts`
- Modify: `packages/api/src/auth/auth.service.spec.ts`

Background: `generateTokens` is currently sync and private. We split it into `signTokens` (sync, no DB) and `persistRefreshToken` (async, DB insert), and update `generateTokens` to be async and call both. Callers (`login` and `register`) keep their existing signatures — only `generateTokens` changes.

- [ ] **Step 1: Write the failing test**

Add this `describe` block to `packages/api/src/auth/auth.service.spec.ts`:

```typescript
describe('AuthService.generateTokens (via login)', () => {
  async function buildService(db: unknown) {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed-token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  it('persists refresh token hash to DB on login', async () => {
    const user = {
      id: 'user-1', email: 'a@b.com', passwordHash: 'hash', role: 'client' as const,
      tenantId: 'tenant-1', name: 'A', phone: null, active: true,
      avatarUrl: null, timezone: 'America/Sao_Paulo', timeFormat: '24h',
      lastLoginAt: null, createdAt: new Date(),
    };
    const insertChain = makeChain((resolve) => resolve([{ id: 'rt-1' }]));
    const loginChain = makeChain((resolve) => resolve(undefined)); // update lastLoginAt
    let callCount = 0;
    const db: Record<string, unknown> = {};
    QUERY_METHODS.forEach((m) => {
      db[m] = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount <= 3 ? loginChain : insertChain;
      });
    });
    db['transaction'] = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(loginChain));
    const insertSpy = db['insert'] as jest.Mock;

    const service = await buildService(db);
    const result = await service.login(user);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(insertSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test:api --testNamePattern="persists refresh token hash"
```

Expected: FAIL — `generateTokens` is currently sync and does not call `insert`.

- [ ] **Step 3: Refactor `auth.service.ts`**

Replace the `generateTokens` private method and its import line with the following. Add `createHash` import at the top, and `refreshTokens` to the drizzle schema import:

```typescript
// top of file — add these imports
import { createHash } from 'crypto';
import { refreshTokens } from '@scheduler/shared';
```

Replace `private generateTokens(...)` with:

```typescript
private signTokens(user: typeof users.$inferSelect) {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name ?? user.email,
    role: user.role,
    tenantId: user.tenantId,
  };
  return {
    accessToken: this.jwtService.sign(payload),
    refreshToken: this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    }),
  };
}

private async persistRefreshToken(
  rawToken: string,
  userId: string,
  tenantId: string | null,
  db: DrizzleDB = this.db,
): Promise<string> {
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [record] = await db
    .insert(refreshTokens)
    .values({ userId, tenantId, tokenHash, expiresAt })
    .returning({ id: refreshTokens.id });
  return record.id;
}

private async generateTokens(
  user: typeof users.$inferSelect,
  db: DrizzleDB = this.db,
) {
  const { accessToken, refreshToken } = this.signTokens(user);
  await this.persistRefreshToken(refreshToken, user.id, user.tenantId, db);
  return { accessToken, refreshToken };
}
```

Also update the `register` call to pass `tx` so the insert happens in the same transaction as the user creation:

```typescript
// Inside register(), change the last line from:
return this.generateTokens(user);
// To:
return this.generateTokens(user, tx);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test:api --testNamePattern="persists refresh token hash"
```

Expected: PASS.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
pnpm test:api
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/auth/auth.service.ts packages/api/src/auth/auth.service.spec.ts
git commit -m "feat(auth): persist refresh token hash to DB on login/register"
```

---

## Task 3: Backend — `POST /auth/refresh` endpoint

**Files:**
- Modify: `packages/api/src/auth/auth.service.ts`
- Modify: `packages/api/src/auth/auth.controller.ts`
- Modify: `packages/api/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Write failing tests for `refresh()` and `revokeChain()`**

Add this `describe` block to `auth.service.spec.ts`:

```typescript
describe('AuthService.refresh', () => {
  const rawRt = 'raw.refresh.token';
  const tokenHash = createHash('sha256').update(rawRt).digest('hex');

  async function buildService(db: unknown) {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('new-token'),
            verify: jest.fn().mockReturnValue({
              sub: 'user-1', email: 'a@b.com', name: 'A',
              role: 'client', tenantId: 'tenant-1', exp: Math.floor(Date.now() / 1000) + 900,
            }),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  it('returns new token pair for valid refresh token', async () => {
    const rtRecord = { id: 'rt-old', tokenHash, revokedAt: null, replacedById: null };
    const user = {
      id: 'user-1', email: 'a@b.com', passwordHash: 'hash', role: 'client' as const,
      tenantId: 'tenant-1', name: 'A', phone: null, active: true,
      avatarUrl: null, timezone: 'America/Sao_Paulo', timeFormat: '24h',
      lastLoginAt: null, createdAt: new Date(),
    };
    let queryCount = 0;
    const chain = makeChain((resolve) => {
      queryCount++;
      if (queryCount === 1) return resolve([rtRecord]);      // SELECT refresh_tokens
      if (queryCount === 2) return resolve([user]);           // SELECT users (inside withTenant)
      return resolve([{ id: 'rt-new' }]);                    // INSERT refresh_tokens
    });
    const db = makeMockDb(chain);
    const service = await buildService(db);

    const result = await service.refresh(rawRt);
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });

  it('throws UnauthorizedException when JWT verification fails', async () => {
    const db = makeSimpleDb([]);
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn().mockImplementation(() => { throw new Error('invalid'); }),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    const service = module.get(AuthService);

    await expect(service.refresh(rawRt)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token hash not found in DB', async () => {
    const service = await buildService(makeSimpleDb([]));
    await expect(service.refresh(rawRt)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException and revokes chain on replay', async () => {
    const revokedRecord = { id: 'rt-old', tokenHash, revokedAt: new Date(), replacedById: 'rt-child' };
    const childRecord = { id: 'rt-child', revokedAt: null, replacedById: null };
    let queryCount = 0;
    const chain = makeChain((resolve) => {
      queryCount++;
      if (queryCount === 1) return resolve([revokedRecord]); // first SELECT → revoked token
      if (queryCount === 2) return resolve([childRecord]);   // SELECT for child in revokeChain
      return resolve([]);
    });
    const service = await buildService(makeMockDb(chain));

    await expect(service.refresh(rawRt)).rejects.toThrow(UnauthorizedException);
  });
});
```

Add `import { createHash } from 'crypto';` at the top of the spec file.

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test:api --testNamePattern="AuthService.refresh"
```

Expected: all FAIL — `refresh` method does not exist yet.

- [ ] **Step 3: Add `refresh()` and `revokeChain()` to `auth.service.ts`**

Add these two methods to the `AuthService` class (after `login`):

```typescript
async refresh(rawRefreshToken: string) {
  let payload: JwtPayload;
  try {
    payload = this.jwtService.verify(rawRefreshToken, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
    }) as JwtPayload;
  } catch {
    throw new UnauthorizedException();
  }

  const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
  const [record] = await this.db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash));

  if (!record) throw new UnauthorizedException();

  if (record.revokedAt) {
    await this.revokeChain(record.id);
    throw new UnauthorizedException();
  }

  if (!payload.tenantId) throw new UnauthorizedException();
  const user = await withTenant(this.db, payload.tenantId, (tx) =>
    tx
      .select()
      .from(users)
      .where(and(eq(users.id, payload.sub), eq(users.tenantId, payload.tenantId!)))
      .then((rows) => rows[0]),
  );
  if (!user || !user.active) throw new UnauthorizedException();

  const { accessToken, refreshToken } = this.signTokens(user);
  const newTokenId = await this.persistRefreshToken(refreshToken, user.id, user.tenantId);

  await this.db
    .update(refreshTokens)
    .set({ revokedAt: new Date(), replacedById: newTokenId })
    .where(eq(refreshTokens.id, record.id));

  return { accessToken, refreshToken };
}

private async revokeChain(tokenId: string, depth = 0): Promise<void> {
  if (depth > 20) return;
  const [record] = await this.db
    .select({
      id: refreshTokens.id,
      revokedAt: refreshTokens.revokedAt,
      replacedById: refreshTokens.replacedById,
    })
    .from(refreshTokens)
    .where(eq(refreshTokens.id, tokenId));
  if (!record) return;
  if (!record.revokedAt) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, tokenId));
  }
  if (record.replacedById) {
    await this.revokeChain(record.replacedById, depth + 1);
  }
}
```

Add `and` to the import from `drizzle-orm` at the top of the file (it's already used in `validateUser` and `listClients`; confirm it's already imported — if not, add it).

- [ ] **Step 4: Add `/auth/refresh` to `auth.controller.ts`**

```typescript
@Post('refresh')
@HttpCode(200)
refresh(@Body('refreshToken') refreshToken: string) {
  if (!refreshToken) throw new BadRequestException('refreshToken is required');
  return this.authService.refresh(refreshToken);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test:api --testNamePattern="AuthService.refresh"
```

Expected: all PASS.

- [ ] **Step 6: Run full test suite**

```bash
pnpm test:api
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/auth/auth.service.ts packages/api/src/auth/auth.controller.ts packages/api/src/auth/auth.service.spec.ts
git commit -m "feat(auth): add POST /auth/refresh with token rotation and replay detection"
```

---

## Task 4: Backend — `POST /auth/logout` endpoint

**Files:**
- Modify: `packages/api/src/auth/auth.service.ts`
- Modify: `packages/api/src/auth/auth.controller.ts`
- Modify: `packages/api/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Write failing test for `logout()`**

Add this `describe` block to `auth.service.spec.ts`:

```typescript
describe('AuthService.logout', () => {
  const rawRt = 'raw.logout.token';
  const tokenHash = createHash('sha256').update(rawRt).digest('hex');

  async function buildService(db: unknown) {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn().mockReturnValue({ sub: 'user-1', tenantId: 'tenant-1' }),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  it('marks refresh token as revoked', async () => {
    const chain = makeChain((resolve) => resolve([{ id: 'rt-1', tokenHash }]));
    const db = makeMockDb(chain);
    const updateSpy = db['update'] as jest.Mock;

    const service = await buildService(db);
    await service.logout(rawRt);

    expect(updateSpy).toHaveBeenCalled();
  });

  it('is a no-op if JWT verification fails', async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: makeSimpleDb([]) },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn().mockImplementation(() => { throw new Error('bad'); }),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    const service = module.get(AuthService);

    // should resolve without throwing even if token is invalid
    await expect(service.logout(rawRt)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test:api --testNamePattern="AuthService.logout"
```

Expected: FAIL — `logout` does not exist.

- [ ] **Step 3: Add `logout()` to `auth.service.ts`**

```typescript
async logout(rawRefreshToken: string): Promise<void> {
  let payload: JwtPayload;
  try {
    payload = this.jwtService.verify(rawRefreshToken, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
    }) as JwtPayload;
  } catch {
    return; // invalid token — nothing to revoke, silently succeed
  }

  const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
  await this.db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, tokenHash), eq(refreshTokens.userId, payload.sub)));
}
```

- [ ] **Step 4: Add `/auth/logout` to `auth.controller.ts`**

```typescript
@Post('logout')
@HttpCode(204)
logout(@Body('refreshToken') refreshToken: string) {
  if (!refreshToken) return;
  return this.authService.logout(refreshToken);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test:api --testNamePattern="AuthService.logout"
```

Expected: all PASS.

- [ ] **Step 6: Run full test suite**

```bash
pnpm test:api
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/auth/auth.service.ts packages/api/src/auth/auth.controller.ts packages/api/src/auth/auth.service.spec.ts
git commit -m "feat(auth): add POST /auth/logout endpoint"
```

---

## Task 5: Frontend — reactive 401 interceptor in `apiFetch`

**Files:**
- Modify: `packages/web/src/lib/api.ts`

- [ ] **Step 1: Replace `packages/web/src/lib/api.ts` with the updated version**

The full new content of `packages/web/src/lib/api.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message)
  }
}

type OnSessionExpired = () => void

let _onSessionExpired: OnSessionExpired = () => {}
let _refreshPromise: Promise<string> | null = null

export function setOnSessionExpired(cb: OnSessionExpired): void {
  _onSessionExpired = cb
}

export async function attemptRefresh(slug: string): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) throw new Error('no refresh token')

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-slug': slug },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) throw new Error('refresh failed')

  const { accessToken, refreshToken: newRt } = await res.json()
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', newRt)
  document.cookie = `refreshToken=${newRt}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`
  window.dispatchEvent(new CustomEvent('token-refreshed', { detail: { accessToken } }))
  return accessToken
}

export async function apiFetch(
  path: string,
  {
    slug,
    token,
    ...options
  }: RequestInit & { slug: string; token?: string | null }
): Promise<Response> {
  const headers: Record<string, string> = {
    'x-tenant-slug': slug,
    ...(options.headers as Record<string, string>),
  }
  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401 && token && path !== '/auth/refresh') {
    try {
      _refreshPromise ??= attemptRefresh(slug).finally(() => { _refreshPromise = null })
      const newToken = await _refreshPromise
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${API_URL}${path}`, { ...options, headers })
    } catch {
      _onSessionExpired()
      throw new ApiError(401, 'Session expired')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, body.message ?? res.statusText, body)
  }

  return res
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/lib/api.ts
git commit -m "feat(web): add reactive 401 interceptor and attemptRefresh to apiFetch"
```

---

## Task 6: Frontend — proactive timer + logout in `AuthProvider`

**Files:**
- Modify: `packages/web/src/providers/AuthProvider.tsx`

- [ ] **Step 1: Add imports**

At the top of `AuthProvider.tsx`, change the `apiFetch` import to also include the new exports:

```typescript
import { apiFetch, attemptRefresh, setOnSessionExpired } from '@/lib/api'
```

- [ ] **Step 2: Add three new `useEffect` blocks inside `AuthProvider`**

Add these three effects inside the `AuthProvider` function, before the `return` statement:

```typescript
// Wire the session-expiry callback so the interceptor in api.ts can call signalExpired
useEffect(() => {
  setOnSessionExpired(signalExpired)
}, [signalExpired])

// Sync React state when a silent refresh succeeds (fired by attemptRefresh in api.ts)
useEffect(() => {
  const handler = (e: Event) => {
    const { accessToken: newToken } = (e as CustomEvent<{ accessToken: string }>).detail
    try {
      const decoded = tokenToUser(newToken)
      const override: UserProfileUpdate = JSON.parse(
        localStorage.getItem('userProfileOverride') || '{}'
      )
      setAccessToken(newToken)
      setUser({ ...decoded, ...override })
      expiryFiredRef.current = false
    } catch {
      signalExpired()
    }
  }
  window.addEventListener('token-refreshed', handler)
  return () => window.removeEventListener('token-refreshed', handler)
}, [signalExpired])

// Proactive timer: refresh 1 minute before the access token expires
useEffect(() => {
  if (!accessToken) return
  let decoded: { exp: number }
  try {
    decoded = jwtDecode<{ exp: number }>(accessToken)
  } catch {
    return
  }
  const delay = decoded.exp * 1000 - Date.now() - 60_000
  if (delay <= 0) return
  const id = setTimeout(async () => {
    const slug = window.location.pathname.split('/')[1] ?? ''
    try {
      await attemptRefresh(slug) // fires 'token-refreshed' → updates state above
    } catch {
      signalExpired()
    }
  }, delay)
  return () => clearTimeout(id)
}, [accessToken, signalExpired])
```

- [ ] **Step 3: Update `logout` to revoke the token on the server**

Replace the existing `logout` `useCallback` with:

```typescript
const logout = useCallback(() => {
  const rt = localStorage.getItem('refreshToken')
  if (rt) {
    const slug = window.location.pathname.split('/')[1] ?? ''
    apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt }),
      slug,
      token: accessToken,
    }).catch(() => {}) // fire-and-forget: local state cleared regardless
  }
  clearTokens()
  localStorage.removeItem('userProfileOverride')
  setUser(null)
  setAccessToken(null)
}, [accessToken])
```

- [ ] **Step 4: Build the web package to catch TypeScript errors**

```bash
pnpm --filter web build 2>&1 | tail -30
```

Expected: build succeeds with no TypeScript errors. If errors appear, fix them before committing.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/providers/AuthProvider.tsx
git commit -m "feat(web): add proactive refresh timer and server-side logout to AuthProvider"
```

---

## Task 7: Smoke test end-to-end

This task has no automated test — it's a manual verification checklist.

- [ ] **Step 1: Start the stack**

```bash
docker compose up --build
```

- [ ] **Step 2: Login and verify both tokens are stored**

Open browser DevTools → Application → Local Storage. Log in to any tenant. Confirm `accessToken` and `refreshToken` are present. Decode the `accessToken` at [jwt.io](https://jwt.io) and confirm `exp` is ~15 minutes from now.

- [ ] **Step 3: Verify `/auth/refresh` works**

In DevTools → Network, wait until the proactive timer fires (within ~14 minutes), or manually POST to `/auth/refresh` with the stored refresh token:

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -H "x-tenant-slug: <your-slug>" \
  -d '{"refreshToken":"<stored-refresh-token>"}'
```

Expected: `{ accessToken: "...", refreshToken: "..." }` with a **different** refresh token than the one sent (rotation).

- [ ] **Step 4: Verify replay detection**

Take the original refresh token used in Step 3 and send the same request again.

Expected: `401 Unauthorized`.

- [ ] **Step 5: Verify logout revokes the token**

Log in, copy the refresh token, click "Sair". Then try to refresh with the copied token:

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -H "x-tenant-slug: <your-slug>" \
  -d '{"refreshToken":"<token-before-logout>"}'
```

Expected: `401 Unauthorized`.
