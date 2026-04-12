# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run everything (Docker required)
docker compose up --build

# Migrations & seed (after services are up)
docker compose exec api pnpm --filter api db:migrate
docker compose exec api pnpm --filter api db:seed

# Local development without Docker (db and redis still need to be up)
pnpm dev:api      # NestJS on :3001
pnpm dev:web      # Next.js on :3000

# Schema changes → always regenerate migrations
pnpm db:generate  # generates SQL migration from schema diff
pnpm db:migrate   # applies pending migrations

# API tests
pnpm test:api
pnpm test:api:e2e

# Rebuild and restart just the web container (common after frontend changes)
docker compose build web && docker compose up -d web
```

`NEXT_PUBLIC_API_URL` is **baked at build time** into the Next.js bundle. Changing it at runtime has no effect. To target a different API, rebuild the web image with `--build-arg NEXT_PUBLIC_API_URL=...`.

## Architecture

### Monorepo layout

```
packages/
  api/      NestJS REST API
  web/      Next.js 16 App Router frontend
  shared/   Drizzle schema + TypeScript types (consumed by api)
```

### Multi-tenancy

Every request carries `x-tenant-slug` header. The flow:

1. `TenantMiddleware` (`api/src/common/middleware/tenant.middleware.ts`) resolves the slug to a `tenantId` UUID and attaches it to `req.tenantId`.
2. `TenantGuard` enforces that `tenantId` is present on protected routes.
3. `@TenantId()` decorator extracts `req.tenantId` into controller method parameters.
4. **All DB operations must use `withTenant(db, tenantId, fn)`** (`api/src/database/with-tenant.ts`). This opens a transaction, calls `SELECT set_config('app.current_tenant_id', tenantId, true)` (transaction-scoped), and runs `fn(tx)`. PostgreSQL RLS policies then filter data automatically. Never query outside `withTenant` — the DB role runs with `NOBYPASSRLS`.

### API guard stack

Controllers that deal with tenant data use this triple guard combination:

```ts
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
```

`@Roles('tenant_admin')` restricts endpoints to specific roles. Omitting `@Roles` means any authenticated user can access. Three roles exist: `tenant_admin`, `professional`, `client`.

### Frontend slug propagation

The Next.js route group `(tenant)` wraps all authenticated pages. Its layout (`app/(tenant)/layout.tsx`) reads `x-tenant-slug` from request headers (injected by Next.js Edge middleware or the dev server) and provides it via `TenantProvider`. All API calls go through `apiFetch` (`lib/api.ts`), which automatically attaches `x-tenant-slug` and the `Authorization: Bearer` header.

TanStack Query is used for all data fetching. Query keys must always include `slug` to prevent cross-tenant cache pollution:
```ts
queryKey: ['appointments', slug]
```

### Database

Schema lives in `packages/shared/src/schema/`. Drizzle is configured with `node-postgres` Pool. The `entryFile` in `nest-cli.json` is `api/src/main` (not the default `main`) because TypeScript infers the rootDir at the monorepo level, placing output at `dist/api/src/main.js`.

### Frontend routing

| Path | Description |
|---|---|
| `/:slug` | Redirects to `/appointments` |
| `/:slug/login` | Login — redirects to `/appointments` after auth |
| `/:slug/register` | Registration — always creates `client` role |
| `/:slug/appointments` | Appointment list (all roles) |
| `/:slug/appointments/create` | New appointment wizard |
| `/:slug/clients` | Client list (admin + professional) |
| `/:slug/professionals` | Professionals list (admin only) |
| `/:slug/professionals/new` | Create professional (admin only) |
| `/:slug/professionals/me` | Redirects professional to own profile page |
| `/:slug/professionals/:id` | Professional detail/edit page |

All authenticated pages are wrapped by the `(app)` route group which renders the `AppShell` (sidebar + header). The sidebar shows role-filtered nav items. `login/page.tsx` always redirects to `/appointments` after login, regardless of role.

### Módulo de Profissionais — regras de acesso

| Endpoint | tenant_admin | professional |
|---|---|---|
| GET /professionals | ✅ lista todos | ❌ |
| GET /professionals/me | ✅ | ✅ (próprio perfil) |
| GET /professionals/:id | ✅ qualquer | ✅ somente o próprio |
| POST /professionals | ✅ | ❌ |
| PATCH /professionals/:id | ✅ todos os campos | ✅ somente o próprio, sem `active`/`role` |
| DELETE /professionals/:id | ✅ exceto si mesmo | ❌ |

Campos do profissional:
- `name`, `email` → tabela `users`
- `bio` (Observações), `avatarUrl`, `position` (Cargo), `active` (Status) → tabela `professionals`
- `role` (Função) → tabela `users`; somente admin pode alterar

Criação de profissional (`POST /professionals`) provisiona um `users` record com `role='professional'` e um `professionals` record na mesma transação.

### Next.js version note

This project uses **Next.js 16**, which has breaking changes from earlier versions. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`.
