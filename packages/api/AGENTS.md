# API Package — Backend Guide

> Full project context (commands, architecture, multi-tenancy overview): see root [`AGENTS.md`](../../AGENTS.md).
> NestJS patterns and best practices (modules, guards, interceptors, DTOs, testing): see [`rules/nestjs-best-practices.md`](../../rules/nestjs-best-practices.md).

## Stack

NestJS 10 · Drizzle ORM · PostgreSQL (RLS) · BullMQ · ioredis · Resend (email) · Twilio (WhatsApp) · Passport JWT

Runs on port **3001**.

---

## Multi-tenancy — The `withTenant` Pattern

Every DB operation **must** be wrapped in `withTenant`. Never query outside it.

```ts
// api/src/database/with-tenant.ts
export async function withTenant<T>(
  db: DrizzleDB,
  tenantId: string,
  fn: (tx: DrizzleDB) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
    return fn(tx as unknown as DrizzleDB)
  })
}
```

`is_local = true` scopes the config to the transaction — it does not leak back to the connection pool. PostgreSQL RLS policies on every table use `current_setting('app.current_tenant_id')` to filter rows automatically. The DB role runs with `NOBYPASSRLS`, so there is no bypass path.

**Tenant resolution flow (per request):**

1. `TenantMiddleware` reads `x-tenant-slug` header → resolves to `tenantId` UUID via `TenantsService` → attaches to `req.tenantId`. Returns 400 if slug not found, 403 if tenant is inactive.
2. `TenantGuard` enforces `req.tenantId` is present on protected routes.
3. `@TenantId()` decorator extracts `req.tenantId` into controller parameters.

---

## Guard Stack

Standard protected routes use:

```ts
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
```

`@Roles('tenant_admin', 'professional')` restricts a handler to those roles. Omitting `@Roles` allows any authenticated tenant user.

Super-admin routes use a **completely separate guard**:

```ts
@UseGuards(SuperAdminGuard)
```

`SuperAdminGuard` verifies the JWT payload contains `type: 'super_admin'`. It has no tenant context — it is a parallel auth plane for the platform operator.

---

## Common Decorators

| Decorator | Source | Extracts |
|---|---|---|
| `@TenantId()` | `common/decorators/tenant-id.decorator.ts` | `req.tenantId` (string) |
| `@CurrentUser()` | `common/decorators/current-user.decorator.ts` | `req.user` (id + role from JWT) |

---

## Request Pipeline

```
Request
  └── TenantMiddleware        (all routes — resolves slug → tenantId)
       └── JwtAuthGuard       (validates JWT, populates req.user)
            └── TenantGuard   (enforces tenantId present)
                 └── RolesGuard (checks @Roles against req.user.role)
                      └── Controller Handler
                           └── withTenant(db, tenantId, fn)  ← all DB access
```

---

## Global Setup (`main.ts`)

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.enableCors();
// Listens on :3001
```

`whitelist: true` strips undeclared DTO fields before they reach services. `transform: true` coerces query string numbers/booleans automatically.

---

## Endpoints Reference

### Auth — `/auth`

| Method | Path | Guard | Description |
|---|---|---|---|
| POST | `/auth/register` | none (tenantId from header) | Register new client account |
| POST | `/auth/login` | `passport-local` | Email + password login → `{ accessToken, refreshToken }` |
| POST | `/auth/refresh` | none | Rotate refresh token |
| POST | `/auth/logout` | none | Invalidate refresh token |
| POST | `/auth/forgot-password` | none | Send reset email |
| GET | `/auth/reset-password/validate` | none | Validate reset token → email |
| POST | `/auth/reset-password` | none | Set new password via token |
| GET | `/auth/invite/validate` | none | Validate invite token → email |
| POST | `/auth/activate-account` | none | Activate account via invite token |
| POST | `/auth/resend-invite` | JWT + Tenant + `tenant_admin` | Re-send invite email |

### OAuth — `/auth/oauth`

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | `/auth/oauth/:provider` | none | Initiate OAuth flow (redirects to provider) |
| GET | `/auth/oauth/:provider/callback` | none | Provider callback — issues exchange code or redirects |
| POST | `/auth/oauth/exchange` | none | Consume exchange code → `{ accessToken, refreshToken }` |
| GET | `/auth/oauth/pending` | none | Read pending SSO registration data by code |
| GET | `/auth/oauth/linked` | JWT + Tenant | List linked providers for current user |
| POST | `/auth/oauth/link/intent` | JWT + Tenant | Generate link URL for adding a provider |
| DELETE | `/auth/oauth/:provider` | JWT + Tenant | Unlink a provider |

Supported providers: `google`. State is stored in Redis with a short TTL to prevent replay.

### Professionals — `/professionals`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/professionals` | `tenant_admin` | List all professionals |
| GET | `/professionals/me` | `tenant_admin`, `professional` | Own profile |
| GET | `/professionals/:id` | `tenant_admin`, `professional` (own) | Profile by id |
| POST | `/professionals` | `tenant_admin` | Create professional (provisions user + professional records) |
| PATCH | `/professionals/:id` | `tenant_admin`, `professional` (own, no `active`/`role`) | Update profile |
| DELETE | `/professionals/:id` | `tenant_admin` (not self) | Delete professional |

### Services — `/services`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/services` | all | List tenant services |
| GET | `/services/:id` | all | Get service |
| POST | `/services` | `tenant_admin` | Create service |
| PATCH | `/services/:id` | `tenant_admin` | Update service |
| DELETE | `/services/:id` | `tenant_admin` | Delete service (`?cancelFuture=true` cancels pending appointments) |

### Availability — `/availability`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/availability/slots` | all | Available slots (`?professionalId&date`) |
| GET | `/availability/weekly/:professionalId` | all | Weekly schedule for a professional |
| POST | `/availability/weekly` | `tenant_admin`, `professional` | Create weekly slot |
| DELETE | `/availability/weekly/:id` | `tenant_admin`, `professional` | Delete weekly slot |
| GET | `/availability/exceptions/:professionalId` | `tenant_admin`, `professional` | Schedule exceptions |
| POST | `/availability/exceptions` | `tenant_admin`, `professional` | Create exception (block/override a date) |
| DELETE | `/availability/exceptions/:id` | `tenant_admin`, `professional` | Delete exception |

Slot computation respects: weekly schedule + exceptions + existing appointments. Double-booking is prevented by a unique DB constraint (atomic check).

### Appointments — `/appointments`

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/appointments` | all | Book appointment |
| GET | `/appointments` | all | List (filtered by role + query params) |
| GET | `/appointments/limit-check` | all | Check daily booking limit |
| GET | `/appointments/:id` | all (own or admin/professional) | Get appointment |
| PATCH | `/appointments/:id/confirm` | all | Confirm appointment |
| PATCH | `/appointments/:id/cancel` | all | Cancel (status differs by role) |
| PATCH | `/appointments/:id/complete` | `tenant_admin`, `professional` | Mark complete |
| DELETE | `/appointments/:id` | `tenant_admin` | Hard delete |

Appointment statuses: `pending`, `confirmed`, `cancelled_by_client`, `cancelled_by_professional`, `completed`.

Query params for `GET /appointments`: `page`, `limit`, `dateFrom`, `dateTo`, `serviceId`, `status`, `clientId`, `professionalId`.

### Clients — `/clients`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/clients` | `tenant_admin`, `professional` | List clients (`?q`, `?active`, `?myClients=true`) |
| GET | `/clients/search` | `tenant_admin`, `professional` | Quick search (`?q`, `?limit`) |
| GET | `/clients/:id` | `tenant_admin`, `professional` | Get client |
| POST | `/clients` | `tenant_admin`, `professional` | Create client (sends invite email) |
| PATCH | `/clients/:id` | `tenant_admin` | Update client |
| DELETE | `/clients/:id` | `tenant_admin` | Delete client (`?cancelFuture=true`) |

### Admins — `/admins`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/admins` | `tenant_admin` | List admins (`?q`, `?active`) |
| GET | `/admins/:id` | `tenant_admin` | Get admin |
| POST | `/admins` | `tenant_admin` | Create admin (sends invite email) |
| PATCH | `/admins/:id` | `tenant_admin` | Update admin |

### Tenants — `/tenants`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/tenants/me` | all | Current tenant settings |
| PATCH | `/tenants/me` | `tenant_admin` | Update tenant settings |

### Notifications — `/notifications`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/notifications` | all | List own notifications (`?page`, `?limit`, `?unreadOnly=true`) |
| GET | `/notifications/unread-count` | all | `{ count: number }` |
| PATCH | `/notifications/mark-all-read` | all | Mark all as read |

### Super-admin — `/super-admin`

Uses `SuperAdminGuard` (JWT with `type: 'super_admin'`). **No tenant context.** Credentials come from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` env vars.

| Method | Path | Description |
|---|---|---|
| POST | `/super-admin/auth/login` | Login → `{ accessToken }` |
| POST | `/super-admin/tenants` | Create tenant |
| GET | `/super-admin/tenants` | List tenants (paginated) |
| GET | `/super-admin/tenants/:id` | Get tenant |
| PATCH | `/super-admin/tenants/:id` | Update tenant (e.g. toggle `active`) |

---

## Email Queue (BullMQ)

Emails are never sent synchronously. Services call `EmailQueueProducer`, which enqueues a job to the `email` BullMQ queue backed by Redis. `EmailQueueProcessor` picks up jobs and delegates to `EmailService` (Resend).

```
Service → EmailQueueProducer.addXJob() → Redis queue → EmailQueueProcessor → EmailService (Resend)
```

Job types: `send-invite`, `send-password-reset`, `send-appointment-notification`.

All jobs retry up to 3 times with exponential backoff (initial delay 5s).

---

## WhatsApp Notifications (Twilio)

`TwilioService` sends WhatsApp messages via Twilio. It gracefully degrades: if `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, or `TWILIO_WHATSAPP_FROM` are not set, it logs a warning and skips sending — no error is thrown.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | JWT signing secret |
| `RESEND_API_KEY` | ✅ | Resend email API key |
| `SUPER_ADMIN_EMAIL` | ✅ | Super-admin login email |
| `SUPER_ADMIN_PASSWORD` | ✅ | Super-admin login password |
| `FRONTEND_BASE_DOMAIN` | ✅ | Base domain for OAuth redirects (e.g. `lvh.me:3000`) |
| `TWILIO_ACCOUNT_SID` | ⬜ | Twilio SID — WhatsApp disabled if absent |
| `TWILIO_AUTH_TOKEN` | ⬜ | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | ⬜ | Twilio sender number |
| `GOOGLE_CLIENT_ID` | ⬜ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ⬜ | Google OAuth client secret |

---

## Tests

```bash
pnpm test:api          # unit tests (Jest)
pnpm test:api:e2e      # e2e tests — requires running PostgreSQL + Redis
```

E2e test files live in `packages/api/test/`. They use `supertest` against a real database — **do not mock the DB in e2e tests**. Unit tests (`*.spec.ts` co-located with source files) mock repositories and external services.
Config file for e2e: `packages/api/test/jest-e2e.json`.
