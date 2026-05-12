# Scheduler

Multi-tenant online scheduling system. Clients book services with professionals, administrators manage the calendar, and each business operates in complete isolation.

## Stack

| Layer | Technology |
|---|---|
| **API** | NestJS · Drizzle ORM · Passport JWT |
| **Web** | Next.js 16 (App Router) · TanStack Query · React Hook Form · Zod |
| **Database** | PostgreSQL 16 with Row-Level Security (RLS) |
| **Cache** | Redis 7 |
| **UI** | shadcn/ui (base-nova) · Tailwind v4 |
| **Infra** | Docker Compose · pnpm workspaces |

## Monorepo structure

```
scheduler/
├── packages/
│   ├── api/          # NestJS REST API (port 3001)
│   ├── web/          # Next.js frontend (port 3000)
│   └── shared/       # Drizzle schema + shared types
├── docker-compose.yml
└── .env
```

## Features

- **Multi-tenancy** — each tenant has its own slug; data is isolated by PostgreSQL RLS policies
- **Booking wizard** — select professional → service → date/time → confirmation
- **Professional/admin panel** — day view, upcoming appointments, statistics
- **Availability** — weekly schedule per professional with exceptions (days off, holidays)
- **Access control** — three roles: `tenant_admin`, `professional`, `client`
- **Confirmation mode** — `auto` (confirmed immediately) or `manual` (requires approval)
- **JWT auth** — access token + refresh token, persisted in `localStorage` and cookie

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [pnpm](https://pnpm.io/installation) (for running outside Docker)

## Running with Docker

```bash
# Clone the repository
git clone <repo-url>
cd scheduler

# Create the environment file
cp .env.example .env
# Edit .env and fill in JWT_SECRET and JWT_REFRESH_SECRET

# Start all services
docker compose up --build

# In another terminal, run migrations and seed
docker compose exec api pnpm --filter api db:migrate
docker compose exec api pnpm --filter api db:seed
```

Access:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001
- **Database (external):** `postgresql://scheduler:scheduler@localhost:5432/scheduler`

## Running locally (without Docker)

```bash
pnpm install

# Start only the database and Redis via Docker
docker compose up db redis -d

# Copy and edit the .env file
cp .env.example .env

# Migrations and seed
pnpm db:migrate
pnpm db:seed

# API and web in parallel
pnpm dev:api   # terminal 1
pnpm dev:web   # terminal 2
```

## Environment variables

Create a `.env` file at the root based on the example below:

```env
# Database
DATABASE_URL=postgres://scheduler:scheduler@db:5432/scheduler

# Redis
REDIS_URL=redis://redis:6379

# JWT — use long, random strings
JWT_SECRET=replace-with-a-secure-secret
JWT_REFRESH_SECRET=replace-with-another-secure-secret
```

> `NEXT_PUBLIC_API_URL` is set as a build arg in `docker-compose.yml` and baked into the Next.js bundle. For local development, the default `http://localhost:3001` is used automatically.

## Demo accounts

After running the seed, the `clinica-demo` tenant is created with the following accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@clinica-demo.com` | `password123` |
| Professional | `prof@clinica-demo.com` | `password123` |

Access: **http://localhost:3000/clinica-demo**

## Useful commands

```bash
# Generate a new migration after changing the schema
pnpm db:generate

# Apply pending migrations
pnpm db:migrate

# Run the seed (demo data)
pnpm db:seed

# API unit tests
pnpm test:api

# API end-to-end tests
pnpm test:api:e2e

# Production build (via Docker)
docker compose build
```

## Architecture

### Multi-tenancy and RLS

Every API request carries the `x-tenant-slug` header, resolved by `TenantGuard` to the tenant UUID. All queries run inside a transaction that sets `app.current_tenant_id` via `set_config` — activating PostgreSQL RLS policies that automatically filter data by tenant.

```
Request → TenantGuard (resolve slug → tenantId)
        → withTenant(db, tenantId, fn)
            → BEGIN
            → SELECT set_config('app.current_tenant_id', tenantId, true)
            → fn(tx)   ← RLS filters automatically
            → COMMIT
```

### API modules

| Module | Responsibility |
|---|---|
| `auth` | Registration, login, JWT generation |
| `appointments` | Appointment CRUD, slot validation |
| `availability` | Weekly schedule and exceptions per professional |
| `professionals` | Professional management |
| `services` | Service catalog management |
| `tenants` | Tenant resolution by slug |

### Frontend routes

| Route | Access | Description |
|---|---|---|
| `/:slug` | Public | Booking wizard |
| `/:slug/login` | Public | Login |
| `/:slug/register` | Public | Sign up (creates client) |
| `/:slug/appointments` | Client | Appointment list |
| `/:slug/dashboard` | Admin / Professional | Control panel |

## License

MIT
