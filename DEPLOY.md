# Deploying to Cloudflare

Architecture: Next.js → Cloudflare Workers (`*.timoup.com`); NestJS → Cloudflare Containers (`api.timoup.com`); Postgres → Neon; Redis → Upstash. Deploys run via GitHub Actions on push to `master`.

## Local tooling

Wrangler 4.x and the OpenNext build require **Node ≥22**. CI workflows use Node 22. The container image itself runs Node 20 (the NestJS runtime, unaffected).

## One-time prerequisites

1. **Workers Paid plan** — required for Containers. Upgrade in the Cloudflare dashboard.
2. **Zone `timoup.com`** active on Cloudflare (already registered).
3. **Neon**: create a project/database, copy the pooled `DATABASE_URL` (it **must** include `sslmode=require`).
   - Create the application role with RLS enforced (no bypass):
     ```sql
     -- run once against the Neon database, as an admin role
     ALTER ROLE <app_role> NOBYPASSRLS;
     ```
     Use this role's credentials in `DATABASE_URL`. The RLS policies are applied by CI on every deploy — see "Migrations & RLS" below.
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
| `DATABASE_URL` | Neon connection string (used by the migration step) |

## Worker secrets (API container) — set once with wrangler

Run from `packages/api/` (`wrangler secret put <NAME>` prompts for the value):

```bash
wrangler secret put DATABASE_URL
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

The `deploy-api.yml` workflow, before deploying, runs two steps against Neon:

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
