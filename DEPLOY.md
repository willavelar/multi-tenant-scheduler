# Deploying to Cloudflare

Architecture: Next.js → Cloudflare Workers (`*.timoup.com`); NestJS → Cloudflare Containers (`api.timoup.com`); Postgres → Neon; Redis → Upstash. Deploys run via GitHub Actions on push to `master`.

## Local tooling

Wrangler 4.x and the OpenNext build require **Node ≥22**. CI workflows use Node 22. The container image itself runs Node 20 (the NestJS runtime, unaffected).

## One-time prerequisites

1. **Workers Paid plan** — required for Containers. Upgrade in the Cloudflare dashboard.
2. **Zone `timoup.com`** active on Cloudflare (already registered).
3. **Neon**: create a project/database. Note the connection string — every `DATABASE_URL` below **must** include `sslmode=require`.

   **Two roles are required** (this is a hard requirement, not optional):
   - Neon's default owner role (`neondb_owner`) has the `BYPASSRLS` attribute, which makes it **skip all RLS policies** — even with `FORCE ROW LEVEL SECURITY`. You also **cannot** remove it (`ALTER ROLE ... NOBYPASSRLS` fails on Neon with `permission denied`). So the running API must connect as a **separate, non-privileged role** that does not have `BYPASSRLS`.
   - Run this once in the Neon SQL Editor, as `neondb_owner`:
     ```sql
     -- dedicated application role (CREATE ROLE defaults to NOBYPASSRLS)
     CREATE ROLE app_user WITH LOGIN PASSWORD 'a-strong-password';

     GRANT CONNECT ON DATABASE neondb TO app_user;   -- use your DB name (SELECT current_database();)
     GRANT USAGE ON SCHEMA public TO app_user;
     GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
     GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

     -- future tables/sequences created by migrations (which run as neondb_owner)
     ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
       GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
     ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
       GRANT USAGE, SELECT ON SEQUENCES TO app_user;
     ```
     (If `CREATE ROLE` is denied, create `app_user` via the Neon dashboard → **Roles** → New Role, then run only the `GRANT`s.)
   - Verify: `SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'app_user';` → `rolbypassrls` must be `f`.
   - **Which role goes where** (same DB, different user — see the secrets sections below):

     | Used by | Role | Why |
     |---|---|---|
     | CI migrations + RLS (GitHub secret `DATABASE_URL`) | `neondb_owner` | owns the schema; creates tables + policies |
     | Running API (wrangler secret `DATABASE_URL`) | `app_user` | no `BYPASSRLS` → RLS actually isolates tenants |
4. **Upstash**: create a Redis database, copy the `REDIS_URL` (rediss:// TLS URL).

## DNS

- `api.timoup.com` — created automatically by the API worker's `custom_domain` route on first deploy.
- Wildcard web route: add a proxied wildcard DNS record so Cloudflare proxies tenant subdomains:
  - Type `AAAA`, Name `*`, Content `100::`, Proxy **on** (orange cloud).
  - The `*.timoup.com/*` Worker route (in `packages/web/wrangler.jsonc`) then serves them.

## GitHub Actions secrets (repo → Settings → Secrets → Actions)

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token with "Edit Workers" + Containers + Workers Routes permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `DATABASE_URL` | Neon connection string **as `neondb_owner`** — used by the migration + RLS steps (needs owner rights) |

## Worker secrets (API container) — set once with wrangler

Run from `packages/api/` (`wrangler secret put <NAME>` prompts for the value).
⚠️ Here `DATABASE_URL` must use the **`app_user`** role (NOBYPASSRLS), NOT `neondb_owner` — this is the credential the running API uses, so RLS must apply to it.

```bash
wrangler secret put DATABASE_URL   # postgres://app_user:...@...neon.tech/<db>?sslmode=require
wrangler secret put REDIS_URL
wrangler secret put JWT_SECRET
wrangler secret put JWT_REFRESH_SECRET
wrangler secret put SUPER_ADMIN_JWT_SECRET
wrangler secret put SUPER_ADMIN_EMAIL
wrangler secret put SUPER_ADMIN_NAME
wrangler secret put SUPER_ADMIN_PASSWORD
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM_EMAIL
wrangler secret put ENCRYPTION_KEY
# optional, only if used:
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_WHATSAPP_FROM
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

`FRONTEND_BASE_DOMAIN` and `OAUTH_CALLBACK_BASE_URL` are set as non-secret `vars` in `wrangler.jsonc`.

## Deploy

- Push to `master`. `deploy-web.yml` and `deploy-api.yml` run based on changed paths.
- Manual: `cd packages/web && pnpm deploy` or `cd packages/api && pnpm cf:deploy`.
- After the first API deploy, allow a few minutes for container provisioning before it responds.

## Migrations & RLS

The `deploy-api.yml` workflow, before deploying, runs two steps against Neon using the **GitHub `DATABASE_URL` secret (the `neondb_owner` role)** — both need owner rights:

1. `pnpm --filter api db:migrate` (`drizzle-kit push:pg`) — syncs the schema (tables/columns).
2. **Apply RLS** — `psql "$DATABASE_URL" -f packages/api/migrations/rls.sql`. This is required because `push:pg` does **not** run the hand-written RLS SQL. `rls.sql` is idempotent (ENABLE/FORCE RLS + `DROP POLICY IF EXISTS` before each `CREATE POLICY`), so it safely re-applies on every deploy and keeps the 7 tenant-scoped tables isolated.

`DATABASE_URL` must include `sslmode=require` for both steps (Neon requires TLS). After deploy, verify RLS is live:

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users','professionals','services','weekly_availability','schedule_exceptions','appointments','notifications')
ORDER BY tablename;
-- rowsecurity must be `t` for all 7 rows
```

If you add a new tenant-scoped table later, add its `ENABLE/FORCE` + policy to `packages/api/migrations/rls.sql`.

## OAuth providers

Update each provider's redirect URI to `https://api.timoup.com/auth/oauth/<provider>/callback`.
