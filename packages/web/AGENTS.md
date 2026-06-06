# Web Package — Frontend Guide

> Full project context (commands, architecture, multi-tenancy, API): see root [`AGENTS.md`](../../AGENTS.md).
> Next.js best practices (DRY, component extraction, custom hooks, data fetching, Server vs Client Components): see [`rules/nextjs/best-practices.md`](../../rules/nextjs/best-practices.md).

<!-- BEGIN:nextjs-agent-rules -->
## Next.js version

This project uses **Next.js 16**, which has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Stack

Next.js 16 App Router · React 19 · Tailwind CSS v4 · shadcn/ui · TanStack Query · React Hook Form + Zod · date-fns

## Styling

Use Tailwind utility classes and the `cn()` helper (`@/lib/utils`) for all styling. Use shadcn/ui components from `components/ui/` as building blocks.

- No `style={{}}` except for values that are genuinely dynamic and cannot be expressed as a Tailwind class (e.g., a JS-computed pixel value or hex color from a runtime function like `pickColor()`).
- Never use `<style>` JSX blocks.

## API integration

All API calls go through `apiFetch` (`lib/api.ts`), which automatically attaches `x-tenant-slug` and `Authorization: Bearer` headers.

TanStack Query is used for all data fetching. Query keys must always include `slug` to prevent cross-tenant cache pollution:

```ts
queryKey: ['appointments', slug]
```

## Environment

`NEXT_PUBLIC_API_URL` is **baked at build time** into the Next.js bundle. Changing it at runtime has no effect. To target a different API, rebuild the web image:

```bash
docker compose build web && docker compose up -d web
```

## Tenant slug — subdomain routing

The tenant slug is the **subdomain**, not a URL path segment. Each tenant gets its own subdomain:

```
clinica-demo.lvh.me:3000/appointments   ✅ correct
localhost:3000/clinica-demo/appointments ❌ wrong
```

**How it flows:**

1. `middleware.ts` splits the `Host` header (`clinica-demo.lvh.me:3000` → `clinica-demo`) and forwards it as `x-tenant-slug`.
2. `(tenant)/layout.tsx` reads `x-tenant-slug` from headers (with direct `Host` fallback) and provides the slug via `TenantProvider`.
3. Client components access the slug with `useTenant()` (`src/providers/TenantProvider.tsx`).
4. `apiFetch` reads the slug from context and attaches it as `x-tenant-slug` on every API request.

**Local development:** `lvh.me` resolves all subdomains to `127.0.0.1` via public DNS — no `/etc/hosts` configuration needed. Use `<slug>.lvh.me:3000` to test a specific tenant locally.

## Routing

Route groups `(tenant)` and `(app)` are invisible in the URL. `(tenant)` provides `TenantProvider`; `(app)` adds the `AppShell` (sidebar + header). The slug is always the subdomain — paths never include it.

**Public / auth routes:**

| Path | Description |
|---|---|
| `/` | Redirects to `/appointments` |
| `/login` | Login — redirects to `/appointments` after auth |
| `/register` | Registration (always creates `client` role) |
| `/activate-account` | Account activation via token (email link) |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Set new password via token |
| `/auth/oauth` | OAuth callback handler |

**Protected routes (AppShell):**

| Path | Description |
|---|---|
| `/appointments` | Appointment list (all roles) |
| `/appointments/create` | New appointment wizard |
| `/appointments/:id` | Appointment detail |
| `/clients` | Client list |
| `/clients/new` | Create client |
| `/clients/:id` | Client detail |
| `/clients/:id/edit` | Edit client |
| `/professionals` | Professionals list (admin only) |
| `/professionals/new` | Create professional (admin only) |
| `/professionals/me` | Redirects professional to their own `/:id` page |
| `/professionals/:id` | Professional detail |
| `/professionals/:id/edit` | Edit professional |
| `/admins` | Admins list (admin only) |
| `/admins/new` | Create admin (admin only) |
| `/admins/me` | Redirects admin to their own `/:id` page |
| `/admins/:id` | Admin detail |
| `/admins/:id/edit` | Edit admin |
| `/me` | Current user profile (role-aware) |
| `/notifications` | Notifications list |
| `/settings/general` | General tenant settings |
| `/settings/services` | Services list |
| `/settings/services/new` | Create service |
| `/settings/services/:id` | Service detail |
| `/settings/services/:id/edit` | Edit service |
