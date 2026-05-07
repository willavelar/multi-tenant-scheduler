# Skeleton Loading States — Design Spec

**Date:** 2026-05-07
**Status:** Approved

## Problem

All loading states across the app display plain text "Carregando..." inside a `<div>`. This creates a jarring layout shift and a poor UX when data is fetched.

## Goal

Replace every "Carregando..." occurrence with skeleton loading components that mirror the shape of the real content, using shadcn/ui conventions and Tailwind.

## Approach

Primitive + reusable composites. One `Skeleton` base primitive; three composites for the three recurring contexts (table, detail, form); inline primitives for unique layouts.

## Components to Create

### `components/ui/skeleton.tsx` — Primitive

A single `<div>` with `animate-pulse bg-muted rounded-md`. Accepts `className` for sizing. All other components are built from this.

### `components/ui/TableSkeleton.tsx` — Composite

Props: `cols: number`, `rows?: number` (default 8)

Renders:
- A header row: `cols` skeleton blocks at ~40% width, low opacity
- `rows` data rows: first column has a circle (avatar) + a block; remaining columns have a single block each
- Wrapped in a `<table>` matching the existing table structure so there is no layout shift when real data arrives

### `components/ui/DetailSkeleton.tsx` — Composite

Props: `fields?: number` (default 8)

Renders:
- Header area: 56px circle (avatar) + two lines (name, email)
- A `DetailCard`-shaped block with `fields` field rows, each row being a 200px label block + a value block

### `components/ui/FormSkeleton.tsx` — Composite

Props: `fields?: number` (default 6)

Renders:
- `fields` field groups, each with a short label block + a full-width input-height block
- Wrapped in the same container/padding as the real form so there is no layout shift

## Files Modified

| File | Change |
|---|---|
| `admins/page.tsx` | `TableSkeleton cols={5}` |
| `admins/[id]/page.tsx` | `DetailSkeleton` |
| `admins/[id]/edit/page.tsx` | `FormSkeleton` |
| `clients/page.tsx` | `TableSkeleton cols={7}` |
| `clients/[id]/page.tsx` | `DetailSkeleton` |
| `clients/[id]/edit/page.tsx` | `FormSkeleton` |
| `clients/_components/ClientForm.tsx` | `FormSkeleton` |
| `professionals/page.tsx` | `TableSkeleton cols={7}` |
| `professionals/[id]/page.tsx` | `DetailSkeleton` |
| `professionals/[id]/edit/page.tsx` | `FormSkeleton` |
| `settings/services/page.tsx` | `TableSkeleton cols={4}` |
| `settings/services/[id]/page.tsx` | `DetailSkeleton` |
| `settings/services/[id]/edit/page.tsx` | `FormSkeleton` |
| `settings/_components/TenantGeneralForm.tsx` | `FormSkeleton` |
| `me/page.tsx` | `DetailSkeleton` — tem 3 queries encadeadas com `if (isLoading)` separados; combinar em um único guard com `isLoading1 \|\| isLoading2 \|\| isLoading3` |
| `professionals/_components/ScheduleCard.tsx` | Inline `Skeleton` (2 spots) |
| `professionals/_components/ExceptionsCard.tsx` | Inline `Skeleton` (2 spots) |
| `appointments/page.tsx` | `TableSkeleton cols={5}` |
| `appointments/_components/CalendarView.tsx` | Inline `Skeleton` |
| `appointments/create/page.tsx` | Inline `Skeleton`: 3 spots com layouts de lista compacta (cards de profissional, serviço, horário) |
| `BookingWizard/StepProfessional.tsx` | Inline `Skeleton` |
| `BookingWizard/StepService.tsx` | Inline `Skeleton` |
| `BookingWizard/StepDateTime.tsx` | Inline `Skeleton` |

## Constraints

- Use Tailwind utility classes only (no `style={{}}`)
- No new dependencies — `Skeleton` is built from scratch following shadcn/ui convention
- `TableSkeleton` must render inside the same `<table>` wrapper as real data to prevent layout shift
- `DetailSkeleton` uses the existing `DetailCard` component so the card chrome matches
