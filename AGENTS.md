# AGENTS.md

Guidance for AI Coding Agents when working with code in this repository.

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Verification Before Done

- Never mark a task complete without proving it works
- Run the full test suite before considering work done
- Verify your changes against the existing behavior
- Ask yourself: "Would a staff engineer approve this?"

### 4. Demand Elegance (Balanced)

- For nontrivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 5. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Run tests to identify the root cause
- Zero context switching required from the user
- Go fix failing tests without being told how

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Minimal code impact.
- **No Laziness**: Find root causes. No temporary workarounds. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Repository

**Scheduler** — a multi-tenant appointment scheduling platform. REST API (NestJS) + web frontend (Next.js 16). Tenants each get isolated data via PostgreSQL RLS. Professionals publish their availability; clients book slots.

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

# Tests
pnpm test:api         # unit tests
pnpm test:api:e2e     # e2e tests (requires running DB)

# Rebuild frontend after env changes (see packages/web/AGENTS.md for details)
docker compose build web && docker compose up -d web
```

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

1. `TenantMiddleware` resolves the slug to a `tenantId` UUID and attaches it to `req.tenantId`.
2. `TenantGuard` enforces that `tenantId` is present on protected routes.
3. `@TenantId()` decorator extracts `req.tenantId` into controller method parameters.
4. **All DB operations must use `withTenant(db, tenantId, fn)`** (`api/src/database/with-tenant.ts`). This opens a transaction, calls `SELECT set_config('app.current_tenant_id', tenantId, true)`, and runs `fn(tx)`. PostgreSQL RLS policies then filter data automatically. Never query outside `withTenant` — the DB role runs with `NOBYPASSRLS`.

### API guard stack

```ts
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
```

`@Roles('tenant_admin')` restricts endpoints to specific roles. Three roles exist: `tenant_admin`, `professional`, `client`.

### Module structure (api)

```
api/src/
  admins/           Admin management
  appointments/     Appointment CRUD + status machine
  auth/             JWT + OAuth + refresh tokens
  availability/     Weekly schedules + schedule exceptions
  clients/          Client profiles
  common/           Guards, decorators, middleware, constants
  database/         Drizzle setup + withTenant helper
  email/            Transactional email (Resend)
  email-queue/      BullMQ email job queue
  notifications/    In-app notifications
  professionals/    Professional profiles + availability
  redis/            ioredis module
  services/         Bookable services per professional
  tenants/          Tenant resolution + caching
```

### Key flows

**Appointment booking**: client selects professional + service → `availability` module computes open slots (respects weekly schedule, exceptions, and existing appointments) → atomic slot check with unique constraint prevents double-booking → appointment created, email queued via BullMQ.

**Multi-tenancy isolation**: every controller method calls `withTenant`, which sets the `app.current_tenant_id` PostgreSQL config for the transaction — RLS policies on every table enforce row-level isolation automatically.

**Email delivery**: emails are enqueued to a BullMQ queue backed by Redis; a worker processes them asynchronously via Resend.

### Professionals module — access rules

| Endpoint | tenant_admin | professional |
|---|---|---|
| GET /professionals | ✅ all | ❌ |
| GET /professionals/me | ✅ | ✅ (own profile) |
| GET /professionals/:id | ✅ any | ✅ own only |
| POST /professionals | ✅ | ❌ |
| PATCH /professionals/:id | ✅ all fields | ✅ own only, no `active`/`role` |
| DELETE /professionals/:id | ✅ except self | ❌ |

Professional fields: `name`, `email` → `users` table; `bio`, `avatarUrl`, `position`, `active` → `professionals` table; `role` → `users` table (admin-only). Creating a professional (`POST /professionals`) provisions both records in the same transaction.

### Database schema (shared/src/schema/)

Key tables: `tenants`, `users`, `professionals`, `clients`, `appointments`, `services`, `weekly-availability`, `schedule-exceptions`, `notifications`, `oauth-accounts`, `refresh-tokens`.

The `entryFile` in `nest-cli.json` is `api/src/main` (not the default `main`) because TypeScript infers the rootDir at the monorepo level, placing output at `dist/api/src/main.js`.

### Frontend

For frontend-specific architecture (routing, styling, API integration, environment, Next.js version guidance), see [`packages/web/AGENTS.md`](packages/web/AGENTS.md).

## Code Conventions

- **pnpm workspaces** monorepo. Always use `pnpm --filter <package> <script>` to target a specific package.
- **TypeScript strict mode** throughout.
- **NestJS patterns**: modules, services, controllers, DTOs with `class-validator`. Guards and decorators live in `api/src/common/`.
- **Drizzle ORM** for all DB access. Schema changes require `pnpm db:generate` → `pnpm db:migrate`. Never hand-edit migration files.
- **Frontend**: see [`packages/web/AGENTS.md`](packages/web/AGENTS.md) for styling, routing, and Next.js-specific conventions.
- Tests: Jest for unit tests; separate `jest-e2e.json` config for e2e tests that hit a real database.
- **Git authorship**: never add `Co-Authored-By: Claude` (or any AI model) to commit messages. Commits must have only the developer as author.
