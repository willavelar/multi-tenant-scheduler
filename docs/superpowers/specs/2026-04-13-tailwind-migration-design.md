# Tailwind Migration & Component Extraction — Design Spec

**Goal:** Migrate every page and component in `packages/web/src` from raw inline `style={{}}` objects and `<style>` JSX blocks to Tailwind v4 utility classes and shadcn/ui primitives. Extract five recurring layout patterns into shared components. Document the styling rule in CLAUDE.md.

**Architecture:** Tailwind v4 (`@import "tailwindcss"`) is already configured in `globals.css`. shadcn/ui components (`Button`, `Card`, `Badge`, `Input`, `Table`, etc.) are already installed in `components/ui/` but unused by the app pages. The `cn()` utility lives in `lib/utils.ts`. This migration wires everything together — no new dependencies needed.

**Tech stack:** Tailwind v4, shadcn/ui (base-ui primitives + CVA), `clsx` + `tailwind-merge` via `cn()`.

---

## Styling Rule (to be added to CLAUDE.md)

> **Styling:** Use Tailwind utility classes and the `cn()` helper (`@/lib/utils`) for all styling. Use shadcn/ui components from `components/ui/` as building blocks. Avoid `style={{}}` except for values that are genuinely dynamic and cannot be expressed as a Tailwind class (e.g., a JS-computed pixel width passed as a prop). Never use `<style>` JSX blocks.

---

## Scope

### Files with inline styles to migrate (381 occurrences across 21 files)

**App pages** (`app/(tenant)/(app)/`):
- `appointments/page.tsx`
- `appointments/create/page.tsx`
- `clients/page.tsx`
- `clients/new/page.tsx`
- `clients/[id]/page.tsx`
- `clients/[id]/edit/page.tsx`
- `professionals/page.tsx`
- `professionals/new/page.tsx`
- `professionals/[id]/page.tsx`

**Auth pages** (`app/(tenant)/`):
- `login/page.tsx`
- `register/page.tsx`

**AppShell components:**
- `components/AppShell/index.tsx`
- `components/AppShell/Header.tsx`
- `components/AppShell/Sidebar.tsx`

**Custom UI components** (rewrite internals to Tailwind):
- `components/ui/BackButton.tsx`
- `components/ui/AvatarName.tsx`
- `components/ui/StatusBadge.tsx`
- `components/ui/DateTimeCell.tsx`

---

## New Shared Components to Extract

Five patterns appear across 3+ pages and have no shared component yet.

### 1. `PageHeader` — `components/ui/PageHeader.tsx`

Top bar present on every detail and form page: optional back button on the left, title in the middle (or left), optional action button on the right.

```tsx
<PageHeader
  back={{ href: '/clients', label: 'Voltar para clientes' }}
  action={{ label: 'Editar cliente', onClick: () => router.push(`/clients/${id}/edit`) }}
/>
```

Props: `back?: { href: string; label: string }`, `title?: string`, `action?: { label: string; onClick: () => void; variant?: 'primary' | 'destructive' }`.

### 2. `DetailCard` — `components/ui/DetailCard.tsx`

White card with border used in every detail page to group field rows. Wraps content in a consistent container.

```tsx
<DetailCard>
  <FieldRow label="Nome" value={client.name} />
  <FieldRow label="E-mail" value={client.email} />
</DetailCard>
```

Props: `children: ReactNode`, `className?: string`.

### 3. `FieldRow` — `components/ui/FieldRow.tsx`

Label + value display row with bottom border separator. Used in client detail, professional detail. Value can be a string or a ReactNode (for badges, pills, etc.).

```tsx
<FieldRow label="Status" value={<StatusBadge active={client.active} />} />
<FieldRow label="Telefone" value={client.phone ?? '—'} />
```

Props: `label: string`, `value: ReactNode`.

### 4. `DangerZone` — `components/ui/DangerZone.tsx`

Red-bordered section with two-step delete confirmation. Accepts a title, description, and the delete callback. Manages its own `confirm` and `pending` state.

```tsx
<DangerZone
  title="Excluir cliente"
  description="Esta ação excluirá permanentemente o cliente e todos os seus agendamentos."
  onDelete={handleDelete}
/>
```

Props: `title: string`, `description: string`, `onDelete: () => Promise<void>`, `deleteLabel?: string`.

### 5. `EmptyState` — `components/ui/EmptyState.tsx`

Centered "no results" message with optional sub-text and action button. Used in listing pages when the data array is empty.

```tsx
<EmptyState
  title="Nenhum cliente encontrado"
  description="Cadastre o primeiro cliente para começar."
  action={{ label: 'Novo cliente', onClick: () => router.push('/clients/new') }}
/>
```

Props: `title: string`, `description?: string`, `action?: { label: string; onClick: () => void }`.

---

## Existing Custom Components — Rewrite with Tailwind

### `BackButton`
Replace manual `style={{}}` with shadcn/ui `Button`. `variant="ghost"` maps to the ghost variant, `variant="border"` maps to `variant="outline"`.

### `StatusBadge`
Replace manual inline styles with shadcn/ui `Badge`. Map `active: true` → `variant="secondary"` with green text class, `active: false` → `variant="destructive"` outline. Keep the dot indicator using a Tailwind `rounded-full` span.

### `AvatarName`
Replace style object with Tailwind classes. The computed background color from `pickColor()` stays as a `style` prop (it's a dynamic JS value — this is the one legitimate `style={{}}` exception).

### `DateTimeCell`
Replace all `style={{}}` with Tailwind classes. No dynamic values.

---

## AppShell Migration

`AppShell/index.tsx`, `Header.tsx`, and `Sidebar.tsx` are migrated to Tailwind. The layout structure (fixed sidebar + main content area) is preserved; only the styling approach changes.

---

## Files NOT in scope

- `components/ui/button.tsx`, `card.tsx`, `badge.tsx`, etc. (already Tailwind)
- `providers/` (no styling)
- `hooks/`, `types/`, `lib/` (no UI)
- `BookingWizard/` components (already minimal inline styles; can be addressed in a follow-up)

---

## CLAUDE.md Update

Add the styling rule under a new `## Styling` section at the top of `packages/web/CLAUDE.md` (currently just contains `@AGENTS.md`), and also add it to the root `CLAUDE.md`.
