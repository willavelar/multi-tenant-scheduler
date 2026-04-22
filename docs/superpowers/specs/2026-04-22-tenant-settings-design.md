# Tenant Settings — Design Spec

**Date:** 2026-04-22
**Status:** Approved

## Overview

Adds a "Configurações > Gerais" page where tenant admins can edit the tenant's name and logo. The logo replaces the brand area in the sidebar. The page title updates to `{tenantName} | {APP_NAME}`. The slug (host) is shown as read-only.

---

## Backend

### New endpoints (TenantsController)

Both protected by `@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)` + `@Roles('tenant_admin')`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tenants/me` | Returns `{ id, name, slug, logoUrl }` for the current tenant |
| PATCH | `/tenants/me` | Updates `name` and/or `logoUrl` |

### TenantsService additions

- `findCurrent(tenantId: string)` — selects `id, name, slug, logoUrl` from `tenants` where `id = tenantId`
- `update(tenantId: string, dto: UpdateTenantDto)` — patches `name` and/or `logoUrl`

### DTO

```ts
// update-tenant.dto.ts
class UpdateTenantDto {
  name?:    string   // optional, min length 2
  logoUrl?: string | null
}
```

### Module changes

- Add `TenantsController` to `tenants.module.ts`
- Export `TenantsService` so it can be injected if needed elsewhere

---

## Frontend

### Env var

Add to `packages/web/.env`:
```
NEXT_PUBLIC_APP_NAME=Scheduler
```

Used in: `document.title = "${tenantName} | ${process.env.NEXT_PUBLIC_APP_NAME}"`

### New hook: `useTenantSettings`

File: `packages/web/src/hooks/useTenantSettings.ts`

- `useTenantSettings()` — `GET /tenants/me`, query key `['tenant-settings', slug]`
- `useUpdateTenantSettings()` — `PATCH /tenants/me`, on success invalidates `['tenant-settings', slug]`

### New provider: `TenantSettingsProvider`

File: `packages/web/src/providers/TenantSettingsProvider.tsx`

- Wraps the AppShell inside the `(app)` layout
- Calls `useTenantSettings()` internally
- Exposes `{ tenantName: string; tenantLogoUrl: string | null }` via context
- On query success, also calls `useEffect` to set `document.title`

### Sidebar changes

Inside `<div className="flex items-center gap-2.5">`:

- **Logo present:** `<img src={tenantLogoUrl} className="h-9 w-auto max-w-full object-contain" alt={tenantName} />`
- **No logo:** current icon (`w-8 h-8` indigo box) + `tenantName` text (replaces hardcoded "Scheduler")

Visible to all authenticated users (logo/name is always shown).

### Document title

In `TenantSettingsProvider`, a `useEffect` that runs when `tenantName` changes:
```ts
document.title = `${tenantName} | ${process.env.NEXT_PUBLIC_APP_NAME ?? 'Scheduler'}`
```

### AvatarCropField changes

Add optional props:
- `aspect?: number` — crop aspect ratio (default `1`)
- `outputWidth?: number` — canvas output width (default `256`)
- `outputHeight?: number` — canvas output height (default `256`)

All existing usages (`AvatarCropField` with `name` prop for avatar) continue to work unchanged.

### New component: LogoCropField

File: `packages/web/src/components/ui/LogoCropField.tsx`

Thin wrapper around `AvatarCropField` with:
- `aspect={3}` (3:1 horizontal logo)
- `outputWidth={480}` / `outputHeight={160}`
- No `name` prop (shows a placeholder rectangle instead of initials)
- Preview shows current logo image (rectangular) or a dashed placeholder

### Settings route

```
packages/web/src/app/(tenant)/(app)/settings/
  general/
    page.tsx
```

`page.tsx` — `'use client'`, admin-only access check, renders a `TenantGeneralForm`.

### TenantGeneralForm

File: `packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx`

Fields:
| Field | Type | Editable | Notes |
|-------|------|----------|-------|
| Logo | LogoCropField | Yes | Rectangular crop 3:1 |
| Nome | text input | Yes | Required, min 2 chars |
| Host (slug) | text input | No | `disabled`, styled with opacity-60 |

On submit: calls `useUpdateTenantSettings()`, shows success/error inline.

### Sidebar nav changes

New section "Configurações" visible only to `tenant_admin`:

```ts
// After existing NAV_ITEMS
const SETTINGS_ITEMS: NavItem[] = [
  { label: 'Gerais', href: '/settings/general', icon: <SettingsIcon />, roles: ['tenant_admin'] },
]
```

Rendered below the main nav with a "Configurações" section label, same visual style as "Menu".

---

## Data flow on save

1. User submits `TenantGeneralForm`
2. `useUpdateTenantSettings()` calls `PATCH /tenants/me`
3. On success: TanStack Query invalidates `['tenant-settings', slug]`
4. `TenantSettingsProvider` re-renders with new `tenantName` / `tenantLogoUrl`
5. Sidebar updates logo/name immediately
6. `document.title` updates via `useEffect`

---

## Out of scope

- Changing the slug (host) — shown read-only, never editable
- Confirmation mode field (already exists in schema but not requested)
- Settings sub-navigation layout (only "Gerais" exists for now)
