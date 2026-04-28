# Refresh Token Design

**Date:** 2026-04-28
**Status:** Approved

## Context

Access tokens are already configured for 15-minute expiry (`auth.module.ts`). Refresh tokens are already generated with 7-day expiry and `JWT_REFRESH_SECRET`, but no `/auth/refresh` endpoint exists and the frontend never uses the refresh token — `signalExpired()` simply redirects to login.

This spec wires up the complete refresh token lifecycle.

## Decisions

| Topic | Decision |
|---|---|
| Token storage | PostgreSQL via Drizzle (existing stack) |
| Rotation | Enabled — each use issues a new pair |
| Replay detection | Yes — replaying a revoked token revokes the entire descendant chain |
| Frontend refresh strategy | Hybrid: proactive timer + reactive 401 interceptor |
| Logout scope | Current device only (single token revocation) |

## Database

### New table: `refresh_tokens`

File: `packages/shared/src/schema/refresh-tokens.schema.ts`

```
id           uuid PK
tokenHash    text       SHA-256 of the raw refresh token JWT
userId       uuid       FK → users.id
tenantId     uuid
expiresAt    timestamp
revokedAt    timestamp  nullable — null means valid
replacedById uuid       nullable FK → refresh_tokens.id (rotation chain)
createdAt    timestamp
```

The raw token is never stored. Only the SHA-256 hash is persisted.

**No RLS policy needed** — `refresh_tokens` is queried via a service account with a direct `where userId = ?` clause, not via the tenant-scoped path. The table is not tenant-data; it is auth infrastructure.

Migration: generated via `pnpm db:generate` after schema change; applied via `pnpm db:migrate`.

## Backend

### Modified: `auth.service.ts` — `generateTokens()`

Signature changes to accept a transaction context (or the db directly). After signing the refresh JWT:
1. Computes `SHA-256(rawRefreshToken)`
2. Inserts a row into `refresh_tokens` with `userId`, `tenantId`, `expiresAt = now + 7d`
3. Returns `{ accessToken, refreshToken }` as before

### New endpoint: `POST /auth/refresh`

No auth guard (the refresh token is the credential). Accepts `{ refreshToken: string }` in the body.

Flow:
1. Verify JWT signature with `JWT_REFRESH_SECRET` — 401 if invalid or expired
2. Compute SHA-256 of the token; query `refresh_tokens` by hash
3. If row not found → 401
4. If `revokedAt` is set → **replay detected** → revoke entire descendant chain (follow `replacedById` links) → 401
5. If valid: mark current row `revokedAt = now`, generate new pair (which inserts a new row), set `current.replacedById = newRow.id` → return `{ accessToken, refreshToken }`

### New endpoint: `POST /auth/logout`

Protected by `JwtAuthGuard`. Accepts `{ refreshToken: string }` in the body.

Flow:
1. Compute SHA-256 of token
2. Find row by hash where `userId = req.user.id`
3. Set `revokedAt = now`
4. Return 204

## Frontend

### `lib/api.ts` — reactive interceptor

`apiFetch` is wrapped so that on a 401 response:
1. Checks a module-level `refreshPromise` singleton — if a refresh is already in flight, await it instead of starting another
2. Calls `POST /auth/refresh` with the stored refresh token
3. **Success**: persists new tokens, dispatches a `token-refreshed` custom event (AuthProvider listens), retries the original request with the new access token
4. **Failure**: calls the `onSessionExpired` callback (wired from AuthProvider via a module-level setter) → redirects to login

Requests that arrive during an in-flight refresh are queued and resolved once the refresh settles.

### `AuthProvider.tsx` — proactive timer

On access token load (login, register, localStorage hydration):
1. Decode `exp` from the JWT
2. Compute `delay = (exp * 1000) - Date.now() - 60_000` (1 minute early)
3. If `delay > 0`: schedule `setTimeout(silentRefresh, delay)`
4. `silentRefresh`: calls `POST /auth/refresh`, on success updates React state and reschedules the timer for the new token
5. Timer is cleared on logout and on unmount

### `AuthProvider.tsx` — logout

```
1. fire-and-forget POST /auth/logout (tolerant to network failure)
2. clearTokens()
3. setUser(null), setAccessToken(null)
```

## Error Handling

| Scenario | Behavior |
|---|---|
| Refresh token expired (JWT) | `/auth/refresh` returns 401; frontend calls `signalExpired()` |
| Refresh token revoked (DB) | same as above |
| Replay detected | server revokes chain, returns 401; frontend calls `signalExpired()` |
| `/auth/refresh` unreachable | interceptor catches network error, calls `signalExpired()` |
| Multiple concurrent 401s | deduplicated via `refreshPromise` singleton |
| Tab backgrounded past timer | reactive interceptor handles the first 401 after re-activation |

## Files to Create

- `packages/shared/src/schema/refresh-tokens.schema.ts`

## Files to Modify

- `packages/shared/src/schema/index.ts` — export new schema
- `packages/api/src/auth/auth.service.ts` — `generateTokens()`, add `refresh()`, add `logout()`
- `packages/api/src/auth/auth.controller.ts` — add `/refresh` and `/logout` endpoints
- `packages/api/src/auth/auth.module.ts` — no changes needed (refresh validation is done inline in the service)
- `packages/web/src/lib/api.ts` — reactive 401 interceptor
- `packages/web/src/providers/AuthProvider.tsx` — proactive timer, logout flow
