# Alert Component Design

**Date:** 2026-05-12  
**Status:** Approved

## Overview

Create a reusable `Alert` component in `packages/web/src/components/ui/Alert.tsx` using CVA (class-variance-authority), matching the pattern already used by `button.tsx`. Replace all inline alert `<div>` blocks across auth pages and `CancellationDeadlineBanner`.

## Component API

```tsx
<Alert variant="warning" size="md" title="Sessão expirada">
  Faça login para continuar.
</Alert>

<Alert variant="error" size="sm">
  E-mail ou senha incorretos
</Alert>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'warning' \| 'success' \| 'error' \| 'info'` | `'error'` | Controls color scheme and icon |
| `size` | `'md' \| 'sm'` | `'md'` | `md` = page-level banner (rounded-xl, larger padding), `sm` = inline form error (rounded-lg, smaller padding) |
| `title` | `string` (optional) | — | Bold top line; if omitted, children fills the single line |
| `children` | `ReactNode` | — | Message or description (when title is present) |
| `className` | `string` (optional) | — | External spacing overrides (margin) |

### Variants

| Variant | Color | Icon |
|---|---|---|
| `warning` | Amber | Triangle with exclamation |
| `success` | Green | Checkmark in circle |
| `error` | Destructive/Red | Circle with dot |
| `info` | Blue | Circle with "i" |

### Sizes

| Size | Border radius | Padding | Gap | Use case |
|---|---|---|---|---|
| `md` | `rounded-xl` | `px-4 py-3` | `gap-2.5` | Page-level banner (above form card) |
| `sm` | `rounded-lg` | `px-3 py-2.5` | `gap-2` | Inline form submission error (inside card) |

### Layout logic

- **With title:** Icon + column (bold title, description text below)
- **Without title:** Icon + single line message (current behavior of all form errors)

## Dark mode

All variants support dark mode. Pattern matches existing inline alerts:
- `dark:bg-{color}-500 dark:border-{color}-500 dark:text-white` for solid dark backgrounds
- Icon color adjusts to `dark:text-white` when on solid background

## Icons

SVG inline (no external dependency). Each variant has a dedicated icon:
- `warning`: `<path d="M10.29 3.86L1.82 18..."/>` (triangle)
- `success`: `<path d="M22 11.08V12..."/>` + `<polyline points="22 4 12 14.01 9 11.01"/>` (checkmark)
- `error`: `<circle cx="12" cy="12" r="10"/>` + dot (circle info)
- `info`: same as error icon, blue tones

## Animation

All alerts include `animate-in fade-in slide-in-from-top-2 duration-300` matching existing patterns.

## Files to update

| File | Change |
|---|---|
| `packages/web/src/components/ui/Alert.tsx` | Implement component (replaces empty stub) |
| `packages/web/src/app/(tenant)/login/page.tsx` | Replace 3 banners (warning/success, size="md") + 1 form error (error, size="sm") |
| `packages/web/src/app/(tenant)/register/page.tsx` | Replace 1 form error (error, size="sm") |
| `packages/web/src/app/(tenant)/forgot-password/page.tsx` | Replace 1 form error (error, size="sm") |
| `packages/web/src/app/(tenant)/reset-password/page.tsx` | Replace 1 form error (error, size="sm") |
| `packages/web/src/app/(tenant)/activate-account/page.tsx` | Replace 1 form error (error, size="sm") |
| `packages/web/src/app/(tenant)/(app)/appointments/_components/CancellationDeadlineBanner.tsx` | Replace inline `<div>` with `<Alert variant="warning" title="...">` |

## Out of scope

Field-level validation errors (`<p className="text-red-500">`) — these are per-field inline messages, not block alerts. They stay as-is.
