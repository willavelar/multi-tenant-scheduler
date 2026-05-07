# Button Component Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ~50 raw `<button>` elements across the codebase with a single `Button` component that has 5 color variants and 4 size variants, supporting left-side SVG icons and a loading state.

**Architecture:** Rewrite `components/ui/button.tsx` from scratch (removing `@base-ui/react/button`) using `React.forwardRef` over a native `<button>`, keeping `cva` + exporting `buttonVariants` for backward compatibility with `calendar.tsx`. Migrate all raw buttons file-by-file in dependency order (core component first, then shadcn consumers, then app components).

**Tech Stack:** React, Tailwind CSS, `class-variance-authority`, `cn()` from `@/lib/utils`

---

## File Map

| File | Action |
|---|---|
| `packages/web/src/components/ui/button.tsx` | Rewrite |
| `packages/web/src/components/ui/BackButton.tsx` | Modify |
| `packages/web/src/components/ui/PageHeader.tsx` | Modify |
| `packages/web/src/components/ui/calendar.tsx` | Modify |
| `packages/web/src/components/ui/dialog.tsx` | Modify |
| `packages/web/src/components/ui/sheet.tsx` | Modify |
| `packages/web/src/components/BookingWizard/StepConfirm.tsx` | Modify |
| `packages/web/src/components/BookingWizard/StepDateTime.tsx` | Modify |
| `packages/web/src/components/Sidebar.tsx` | No change needed (already uses Button) |
| `packages/web/src/components/ui/DangerZone.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/appointments/_components/CancelAppointmentModal.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/professionals/_components/ScheduleCard.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalForm.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/settings/services/_components/ServiceForm.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/admins/_components/AdminForm.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/settings/general/page.tsx` (TenantGeneralForm) | Modify |
| `packages/web/src/app/(tenant)/(app)/clients/_components/ClientDetailView.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalDetailView.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/admins/_components/AdminDetailView.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/settings/services/_components/ServiceDetailView.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/appointments/page.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentFilters.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/clients/page.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/professionals/page.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/admins/page.tsx` | Modify |
| `packages/web/src/app/(tenant)/(app)/settings/services/page.tsx` | Modify |

---

## Variants Reference

| Variant | Classes |
|---|---|
| `primary` | `bg-indigo-500 text-white hover:bg-indigo-600` |
| `secondary` | `bg-background text-foreground border border-border hover:bg-accent` |
| `destructive` | `bg-red-600 text-white hover:bg-red-700` |
| `destructive-outline` | `border border-red-200 text-red-500 hover:bg-red-50` |
| `ghost` | `text-foreground hover:bg-accent` |

| Size | Height | Padding | Text |
|---|---|---|---|
| `lg` | `h-[42px]` | `px-6` | `text-sm` |
| `md` | `h-9` | `px-4` | `text-[13.5px]` |
| `sm` | `h-9` | `px-3.5` | `text-[13px]` |
| `xs` | `h-7` | `px-2.5` | `text-xs` |

Defaults: `variant="primary"`, `size="md"`

---

### Task 1: Rewrite `button.tsx`

**Files:**
- Modify: `packages/web/src/components/ui/button.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:opacity-65 disabled:cursor-not-allowed disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:               'bg-indigo-500 text-white hover:bg-indigo-600',
        secondary:             'bg-background text-foreground border border-border hover:bg-accent',
        destructive:           'bg-red-600 text-white hover:bg-red-700',
        'destructive-outline': 'border border-red-200 text-red-500 hover:bg-red-50',
        ghost:                 'text-foreground hover:bg-accent',
      },
      size: {
        lg: 'h-[42px] px-6 text-sm',
        md: 'h-9 px-4 text-[13.5px]',
        sm: 'h-9 px-3.5 text-[13px]',
        xs: 'h-7 px-2.5 text-xs',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

function Spinner() {
  return (
    <svg
      className="animate-spin shrink-0"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    icon?:    React.ReactNode
    loading?: boolean
  }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, icon, loading, disabled, children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? <Spinner /> : icon}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd packages/web && pnpm tsc --noEmit --skipLibCheck 2>&1 | head -30`

Expected: errors only in files that still import old variants (`default`, `outline`, `icon`, `icon-sm`). These will be fixed in subsequent tasks. If new errors appear in `button.tsx` itself, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/button.tsx
git commit -m "feat(web): rewrite Button component with 5 variants and 4 sizes"
```

---

### Task 2: Update `BackButton.tsx` and `PageHeader.tsx`

**Files:**
- Modify: `packages/web/src/components/ui/BackButton.tsx`
- Modify: `packages/web/src/components/ui/PageHeader.tsx`

- [ ] **Step 1: Rewrite `BackButton.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  href: string
  children: ReactNode
  variant?: 'border' | 'ghost'
}

const chevron = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

export function BackButton({ href, children, variant = 'border' }: Props) {
  const router = useRouter()
  return (
    <Button
      variant={variant === 'ghost' ? 'ghost' : 'secondary'}
      size="sm"
      icon={chevron}
      onClick={() => router.push(href)}
      className={variant === 'ghost' ? 'mb-5 px-0' : undefined}
    >
      {children}
    </Button>
  )
}
```

- [ ] **Step 2: Rewrite `PageHeader.tsx`**

The `action.icon` prop is added so callers can pass an SVG icon to the action button.

```tsx
'use client'

import { BackButton } from './BackButton'
import { Button } from '@/components/ui/button'
import type { ReactNode } from 'react'

type Props = {
  back?: { href: string; label: string }
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'destructive'
    icon?: ReactNode
  }
}

export function PageHeader({ back, action }: Props) {
  return (
    <div className="flex justify-between items-center mb-7">
      <div>
        {back && (
          <BackButton href={back.href}>{back.label}</BackButton>
        )}
      </div>
      {action && (
        <Button
          variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
          size="md"
          icon={action.icon}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/BackButton.tsx packages/web/src/components/ui/PageHeader.tsx
git commit -m "feat(web): migrate BackButton and PageHeader to unified Button"
```

---

### Task 3: Update shadcn consumers — `calendar.tsx`, `dialog.tsx`, `sheet.tsx`

**Files:**
- Modify: `packages/web/src/components/ui/calendar.tsx`
- Modify: `packages/web/src/components/ui/dialog.tsx`
- Modify: `packages/web/src/components/ui/sheet.tsx`

- [ ] **Step 1: Fix `calendar.tsx`**

The only change is removing `size="icon"` from `CalendarDayButton` (the size is overridden by className anyway, and `icon` no longer exists as a valid size). The `buttonVariant` prop type automatically narrows to new variants since it comes from `React.ComponentProps<typeof Button>["variant"]`.

In `CalendarDayButton` (around line 198), change:
```tsx
// BEFORE
<Button
  variant="ghost"
  size="icon"
  data-day={...}
```
```tsx
// AFTER
<Button
  variant="ghost"
  data-day={...}
```

- [ ] **Step 2: Fix `dialog.tsx`**

Two changes:
1. Close button: `size="icon-sm"` → `size="xs"` + `className` override to make it square
2. DialogFooter close button: `variant="outline"` → `variant="secondary"`

Close button (around line 66):
```tsx
// BEFORE
<Button
  variant="ghost"
  className="absolute top-2 right-2"
  size="icon-sm"
/>
// AFTER
<Button
  variant="ghost"
  size="xs"
  className="absolute top-2 right-2 size-7 p-0"
/>
```

DialogFooter (around line 112):
```tsx
// BEFORE
<DialogPrimitive.Close render={<Button variant="outline" />}>
// AFTER
<DialogPrimitive.Close render={<Button variant="secondary" />}>
```

- [ ] **Step 3: Fix `sheet.tsx`**

Close button (around line 66):
```tsx
// BEFORE
<Button
  variant="ghost"
  className="absolute top-3 right-3"
  size="icon-sm"
/>
// AFTER
<Button
  variant="ghost"
  size="xs"
  className="absolute top-3 right-3 size-7 p-0"
/>
```

- [ ] **Step 4: Verify**

Run: `cd packages/web && pnpm tsc --noEmit --skipLibCheck 2>&1 | grep -E "calendar|dialog|sheet" | head -20`

Expected: no errors in these three files.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ui/calendar.tsx packages/web/src/components/ui/dialog.tsx packages/web/src/components/ui/sheet.tsx
git commit -m "feat(web): update shadcn calendar, dialog, sheet to new Button variants"
```

---

### Task 4: Update BookingWizard — `StepConfirm.tsx` and `StepDateTime.tsx`

**Files:**
- Modify: `packages/web/src/components/BookingWizard/StepConfirm.tsx`
- Modify: `packages/web/src/components/BookingWizard/StepDateTime.tsx`

Note: The raw `<button>` "← Voltar" text links in both files are **intentionally kept** — they are styled as text links, not action buttons, and the spec excludes them.

- [ ] **Step 1: Update `StepConfirm.tsx`**

Three changes:
1. Line 127: `<Button variant="outline"` → `<Button variant="secondary"`
2. Lines 154–160: Add `variant="primary"` + swap `disabled={bookMutation.isPending}` for `loading={bookMutation.isPending}`
3. Lines 188, 210: Add `variant="primary"` + swap `disabled={...isSubmitting}` for `loading={...isSubmitting}`

```tsx
// Line 127 — BEFORE
<Button variant="outline" onClick={onDone}>
  Fazer outro agendamento
</Button>
// AFTER
<Button variant="secondary" onClick={onDone}>
  Fazer outro agendamento
</Button>

// Lines 154–160 — BEFORE
<Button
  className="w-full"
  onClick={handleConfirm}
  disabled={bookMutation.isPending}
>
  {bookMutation.isPending ? 'Agendando...' : user ? 'Confirmar' : 'Entrar e confirmar'}
</Button>
// AFTER
<Button
  variant="primary"
  className="w-full"
  onClick={handleConfirm}
  loading={bookMutation.isPending}
>
  {bookMutation.isPending ? 'Agendando...' : user ? 'Confirmar' : 'Entrar e confirmar'}
</Button>

// Line 188 (login form submit) — BEFORE
<Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
  Entrar
</Button>
// AFTER
<Button variant="primary" type="submit" className="w-full" loading={loginForm.formState.isSubmitting}>
  Entrar
</Button>

// Line 210 (register form submit) — BEFORE
<Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
  Criar conta
</Button>
// AFTER
<Button variant="primary" type="submit" className="w-full" loading={registerForm.formState.isSubmitting}>
  Criar conta
</Button>
```

- [ ] **Step 2: Update `StepDateTime.tsx`**

Line 62: `variant="outline" size="sm"` → `variant="secondary" size="sm"`

```tsx
// BEFORE
<Button
  key={slot}
  variant="outline"
  size="sm"
  onClick={() => onSelect(toLocalDateString(selectedDate!), slot)}
>
// AFTER
<Button
  key={slot}
  variant="secondary"
  size="sm"
  onClick={() => onSelect(toLocalDateString(selectedDate!), slot)}
>
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/BookingWizard/StepConfirm.tsx packages/web/src/components/BookingWizard/StepDateTime.tsx
git commit -m "feat(web): migrate BookingWizard buttons to unified Button"
```

---

### Task 5: Update `DangerZone.tsx` and `CancelAppointmentModal.tsx`

**Files:**
- Modify: `packages/web/src/components/ui/DangerZone.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/_components/CancelAppointmentModal.tsx`

- [ ] **Step 1: Rewrite `DangerZone.tsx`**

Add `import { Button } from '@/components/ui/button'` at the top.

Remove the `cancelBtnCls` constant (line 40).

Replace all raw buttons. The complete new JSX sections:

```tsx
// BEFORE — line 40
const cancelBtnCls = 'px-4 py-2 bg-background text-foreground text-[13px] font-medium rounded-lg border border-border cursor-pointer hover:bg-accent transition-colors'
// AFTER — delete this line entirely
```

Blocking state, first action group (lines 102–117):
```tsx
// BEFORE
{onForceDelete && !forceConfirm && (
  <div className="flex items-center gap-3">
    <button
      onClick={() => setForceConfirm(true)}
      className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 transition-colors"
    >
      Cancelar todos e excluir
    </button>
    <button
      onClick={() => setBlocking(null)}
      className={cancelBtnCls}
    >
      Manter
    </button>
  </div>
)}
// AFTER
{onForceDelete && !forceConfirm && (
  <div className="flex items-center gap-3">
    <Button variant="destructive" size="md" onClick={() => setForceConfirm(true)}>
      Cancelar todos e excluir
    </Button>
    <Button variant="secondary" size="md" onClick={() => setBlocking(null)}>
      Manter
    </Button>
  </div>
)}
```

Blocking state, force confirm group (lines 119–138):
```tsx
// BEFORE
{onForceDelete && forceConfirm && (
  <div className="flex items-center gap-3 flex-wrap">
    <span className="text-[13px] text-red-500 font-medium">
      Isso cancelará {blocking.length} agendamento{blocking.length !== 1 ? 's' : ''}. Confirma?
    </span>
    <button
      onClick={handleForceDelete}
      disabled={forcePending}
      className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
    >
      {forcePending ? 'Excluindo...' : 'Sim, cancelar e excluir'}
    </button>
    <button
      onClick={() => setForceConfirm(false)}
      className={cancelBtnCls}
    >
      Não
    </button>
  </div>
)}
// AFTER
{onForceDelete && forceConfirm && (
  <div className="flex items-center gap-3 flex-wrap">
    <span className="text-[13px] text-red-500 font-medium">
      Isso cancelará {blocking.length} agendamento{blocking.length !== 1 ? 's' : ''}. Confirma?
    </span>
    <Button variant="destructive" size="md" loading={forcePending} onClick={handleForceDelete}>
      {forcePending ? 'Excluindo...' : 'Sim, cancelar e excluir'}
    </Button>
    <Button variant="secondary" size="md" onClick={() => setForceConfirm(false)}>
      Não
    </Button>
  </div>
)}
```

No-force-delete close button (lines 140–147):
```tsx
// BEFORE
{!onForceDelete && (
  <button
    onClick={() => setBlocking(null)}
    className={cancelBtnCls}
  >
    Fechar
  </button>
)}
// AFTER
{!onForceDelete && (
  <Button variant="secondary" size="md" onClick={() => setBlocking(null)}>
    Fechar
  </Button>
)}
```

Normal state — initial delete button (lines 162–166):
```tsx
// BEFORE
{!confirm ? (
  <button
    onClick={() => setConfirm(true)}
    className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 transition-colors"
  >
    {deleteLabel}
  </button>
// AFTER
{!confirm ? (
  <Button variant="destructive" size="md" onClick={() => setConfirm(true)}>
    {deleteLabel}
  </Button>
```

Normal state — confirm group (lines 169–185):
```tsx
// BEFORE
) : (
  <div className="flex items-center gap-3">
    <span className="text-[13px] text-red-500 font-medium">Tem certeza?</span>
    <button
      onClick={handleDelete}
      disabled={pending}
      className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Excluindo...' : 'Sim, excluir'}
    </button>
    <button
      onClick={() => setConfirm(false)}
      className={cancelBtnCls}
    >
      Cancelar
    </button>
  </div>
)}
// AFTER
) : (
  <div className="flex items-center gap-3">
    <span className="text-[13px] text-red-500 font-medium">Tem certeza?</span>
    <Button variant="destructive" size="md" loading={pending} onClick={handleDelete}>
      {pending ? 'Excluindo...' : 'Sim, excluir'}
    </Button>
    <Button variant="secondary" size="md" onClick={() => setConfirm(false)}>
      Cancelar
    </Button>
  </div>
)}
```

- [ ] **Step 2: Rewrite buttons in `CancelAppointmentModal.tsx`**

Add `import { Button } from '@/components/ui/button'` at the top.

Deadline-blocked state — "Fechar" button (around line 56):
```tsx
// BEFORE
<button
  onClick={onClose}
  className="px-4 py-[9px] border border-border bg-background text-foreground text-[13.5px] font-semibold rounded-lg cursor-pointer hover:bg-accent transition-colors"
>
  Fechar
</button>
// AFTER
<Button variant="secondary" size="md" onClick={onClose}>
  Fechar
</Button>
```

Normal state — footer buttons (around lines 134–148):
```tsx
// BEFORE
<div className="flex gap-2.5 justify-end">
  <button
    onClick={onClose}
    disabled={cancelMut.isPending}
    className="px-4 py-[9px] border border-border bg-background text-foreground text-[13.5px] font-semibold rounded-lg cursor-pointer hover:bg-accent disabled:opacity-50 transition-colors"
  >
    Voltar
  </button>
  <button
    onClick={handleConfirm}
    disabled={submitDisabled}
    className="px-5 py-[9px] bg-red-600 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 transition-colors"
  >
    {cancelMut.isPending ? 'Cancelando...' : 'Sim, cancelar'}
  </button>
</div>
// AFTER
<div className="flex gap-2.5 justify-end">
  <Button
    variant="secondary"
    size="md"
    onClick={onClose}
    disabled={cancelMut.isPending}
  >
    Voltar
  </Button>
  <Button
    variant="destructive"
    size="md"
    loading={cancelMut.isPending}
    disabled={submitDisabled}
    onClick={handleConfirm}
  >
    {cancelMut.isPending ? 'Cancelando...' : 'Sim, cancelar'}
  </Button>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/DangerZone.tsx
git add "packages/web/src/app/(tenant)/(app)/appointments/_components/CancelAppointmentModal.tsx"
git commit -m "feat(web): migrate DangerZone and CancelAppointmentModal to unified Button"
```

---

### Task 6: Update `ScheduleCard.tsx` — remove `TextBtn`

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/_components/ScheduleCard.tsx`

- [ ] **Step 1: Add import and remove `TextBtn`**

Add `import { Button } from '@/components/ui/button'` to the imports (after existing imports).

Delete the entire `TextBtn` function (lines 31–48).

- [ ] **Step 2: Replace all `TextBtn` usages**

In `CreateDayRows` (the "Indisponível" row):
```tsx
// BEFORE
<TextBtn label="Adicionar" onClick={onOpenAdd} />
// AFTER
<Button variant="secondary" size="xs" onClick={onOpenAdd}>Adicionar</Button>
```

In `CreateDayRows` (slots loop):
```tsx
// BEFORE
<TextBtn label="Remover" onClick={() => onRemove(slot._key)} variant="danger" />
{idx === 0 && <TextBtn label="Adicionar" onClick={onOpenAdd} />}
// AFTER
<Button variant="destructive-outline" size="xs" onClick={() => onRemove(slot._key)}>Remover</Button>
{idx === 0 && <Button variant="secondary" size="xs" onClick={onOpenAdd}>Adicionar</Button>}
```

In `EditDayRows` (the "Indisponível" row):
```tsx
// BEFORE
<TextBtn label="Adicionar" onClick={onOpenAdd} disabled={busy} />
// AFTER
<Button variant="secondary" size="xs" disabled={busy} onClick={onOpenAdd}>Adicionar</Button>
```

In `EditDayRows` (slots loop):
```tsx
// BEFORE
<TextBtn label="Remover" onClick={() => onRemove(slot.id)} disabled={busy} variant="danger" />
{idx === 0 && <TextBtn label="Adicionar" onClick={onOpenAdd} disabled={busy} />}
// AFTER
<Button variant="destructive-outline" size="xs" disabled={busy} onClick={() => onRemove(slot.id)}>Remover</Button>
{idx === 0 && <Button variant="secondary" size="xs" disabled={busy} onClick={onOpenAdd}>Adicionar</Button>}
```

Also update the `AddForm` cancel button (the green Confirmar stays as-is):
```tsx
// BEFORE
<button type="button" onClick={onCancel}
  className="h-7 px-2.5 border border-border text-muted-foreground text-xs font-medium rounded-md cursor-pointer hover:bg-accent transition-colors">
  Cancelar
</button>
// AFTER
<Button variant="secondary" size="xs" type="button" onClick={onCancel}>Cancelar</Button>
```

- [ ] **Step 3: Commit**

```bash
git add "packages/web/src/app/(tenant)/(app)/professionals/_components/ScheduleCard.tsx"
git commit -m "feat(web): replace TextBtn in ScheduleCard with unified Button"
```

---

### Task 7: Update forms — `ProfessionalForm`, `ClientForm`, `ServiceForm`, `AdminForm`, `TenantGeneralForm`

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalForm.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/settings/services/_components/ServiceForm.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/admins/_components/AdminForm.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/settings/general/page.tsx` (contains TenantGeneralForm)

The pattern is identical across all forms. The save icon SVG is:
```tsx
const SaveIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)
```

- [ ] **Step 1: Update `ProfessionalForm.tsx`**

Add `import { Button } from '@/components/ui/button'` to imports.

Replace the footer buttons (around lines 299–321):
```tsx
// BEFORE
<button
  type="submit"
  disabled={isSubmitting}
  className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
>
  {isSubmitting ? (
    <>
      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Salvando...
    </>
  ) : mode === 'create' ? 'Cadastrar profissional' : 'Salvar alterações'}
</button>
{onCancel && (
  <button
    type="button"
    onClick={onCancel}
    className="h-[42px] px-5 bg-background text-foreground border border-border rounded-lg text-sm font-medium cursor-pointer hover:bg-accent transition-colors"
  >
    Cancelar
  </button>
)}
// AFTER
<Button
  type="submit"
  variant="primary"
  size="lg"
  loading={isSubmitting}
  icon={
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  }
>
  {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Cadastrar profissional' : 'Salvar alterações'}
</Button>
{onCancel && (
  <Button variant="secondary" size="lg" type="button" onClick={onCancel}>
    Cancelar
  </Button>
)}
```

- [ ] **Step 2: Update `ClientForm.tsx`**

Add `import { Button } from '@/components/ui/button'` to imports.

Replace the footer buttons (around lines 672–694):
```tsx
// BEFORE
<button
  type="submit"
  disabled={isSubmitting}
  className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
>
  {isSubmitting ? (
    <>
      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Salvando...
    </>
  ) : mode === 'create' ? 'Cadastrar cliente' : 'Salvar alterações'}
</button>
<button
  type="button"
  onClick={onCancel}
  className="h-[42px] px-5 bg-background text-foreground border border-border rounded-lg text-sm font-medium cursor-pointer hover:bg-accent transition-colors"
>
  Cancelar
</button>
// AFTER
<Button
  type="submit"
  variant="primary"
  size="lg"
  loading={isSubmitting}
  icon={
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  }
>
  {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Cadastrar cliente' : 'Salvar alterações'}
</Button>
<Button variant="secondary" size="lg" type="button" onClick={onCancel}>
  Cancelar
</Button>
```

- [ ] **Step 3: Update `ServiceForm.tsx`**

Add `import { Button } from '@/components/ui/button'` to imports.

Replace footer buttons (around lines 187–207):
```tsx
// BEFORE
<button
  type="submit"
  disabled={isSubmitting}
  className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
>
  {isSubmitting ? (
    <>
      <svg className="animate-spin" .../>
      Salvando...
    </>
  ) : mode === 'create' ? 'Cadastrar serviço' : 'Salvar alterações'}
</button>
<button
  onClick={onCancel}
  className="h-[42px] px-5 bg-background text-foreground border border-border rounded-lg text-sm font-medium cursor-pointer hover:bg-accent transition-colors"
>
  Cancelar
</button>
// AFTER
<Button
  type="submit"
  variant="primary"
  size="lg"
  loading={isSubmitting}
  icon={
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  }
>
  {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Cadastrar serviço' : 'Salvar alterações'}
</Button>
<Button variant="secondary" size="lg" type="button" onClick={onCancel}>
  Cancelar
</Button>
```

- [ ] **Step 4: Update `AdminForm.tsx`**

Add `import { Button } from '@/components/ui/button'` to imports.

Replace footer buttons (around lines 215–235):
```tsx
// BEFORE
<button
  type="submit"
  disabled={isSubmitting}
  className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
>
  {isSubmitting ? (
    <>
      <svg className="animate-spin" .../>
      Salvando...
    </>
  ) : mode === 'create' ? 'Cadastrar administrador' : 'Salvar alterações'}
</button>
{mode === 'edit' && onCancel && (
  <button
    onClick={onCancel}
    className="h-[42px] px-5 bg-background text-foreground border border-border rounded-lg text-sm font-medium cursor-pointer hover:bg-accent transition-colors"
  >
    Cancelar
  </button>
)}
// AFTER
<Button
  type="submit"
  variant="primary"
  size="lg"
  loading={isSubmitting}
  icon={
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  }
>
  {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Cadastrar administrador' : 'Salvar alterações'}
</Button>
{mode === 'edit' && onCancel && (
  <Button variant="secondary" size="lg" type="button" onClick={onCancel}>
    Cancelar
  </Button>
)}
```

- [ ] **Step 5: Update `TenantGeneralForm.tsx`**

Add `import { Button } from '@/components/ui/button'` to imports.

Remove the local `Spinner` function at the top of the component (lines 55–60) — **only if it's only used in the submit button**. Check first: this component's `Spinner` is also used in the toggle saving indicators (`{toggleSaving === 'paid' && <Spinner />}` etc.). So **keep the local `Spinner`** function, only replace the submit button.

Replace the footer button (around lines 362–374):
```tsx
// BEFORE
<button
  type="submit"
  disabled={isPending}
  className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
>
  {isPending ? (
    <>
      <Spinner />
      Salvando...
    </>
  ) : 'Salvar alterações'}
</button>
// AFTER
<Button
  type="submit"
  variant="primary"
  size="lg"
  loading={isPending}
  icon={
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  }
>
  {isPending ? 'Salvando...' : 'Salvar alterações'}
</Button>
```

Note: Also update the logo "Remover logo" button — this is an inline text-link action, not a full button. Keep it as-is (it is a bare text button with no border/bg, out of scope for unification).

- [ ] **Step 6: Commit**

```bash
git add \
  "packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalForm.tsx" \
  "packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx" \
  "packages/web/src/app/(tenant)/(app)/settings/services/_components/ServiceForm.tsx" \
  "packages/web/src/app/(tenant)/(app)/admins/_components/AdminForm.tsx" \
  "packages/web/src/app/(tenant)/(app)/settings/general/page.tsx"
git commit -m "feat(web): migrate form submit/cancel buttons to unified Button"
```

---

### Task 8: Update detail views

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/clients/_components/ClientDetailView.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalDetailView.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/admins/_components/AdminDetailView.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/settings/services/_components/ServiceDetailView.tsx`

Each file has a single "Editar X" primary action button in the page header area.

- [ ] **Step 1: Update `ClientDetailView.tsx`**

Add `import { Button } from '@/components/ui/button'` to imports.

Replace around line 57:
```tsx
// BEFORE
<button
  className="px-4 py-2 bg-indigo-500 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
  onClick={() => router.push(`/clients/${client.id}/edit`)}
>
  {profilePage ? 'Editar' : 'Editar cliente'}
</button>
// AFTER
<Button
  variant="primary"
  size="md"
  onClick={() => router.push(`/clients/${client.id}/edit`)}
>
  {profilePage ? 'Editar' : 'Editar cliente'}
</Button>
```

- [ ] **Step 2: Update `ProfessionalDetailView.tsx`**

Add `import { Button } from '@/components/ui/button'` to imports.

Replace around line 47:
```tsx
// BEFORE
<button
  className="px-4 py-2 bg-indigo-500 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
  onClick={() => router.push(...)}
>
  Editar profissional
</button>
// AFTER
<Button
  variant="primary"
  size="md"
  onClick={() => router.push(...)}
>
  Editar profissional
</Button>
```

- [ ] **Step 3: Update `AdminDetailView.tsx`**

Add `import { Button } from '@/components/ui/button'` to imports.

Replace around line 35:
```tsx
// BEFORE
<button
  className="px-4 py-2 bg-indigo-500 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
  onClick={() => router.push(...)}
>
  Editar administrador
</button>
// AFTER
<Button
  variant="primary"
  size="md"
  onClick={() => router.push(...)}
>
  Editar administrador
</Button>
```

- [ ] **Step 4: Update `ServiceDetailView.tsx`**

Add `import { Button } from '@/components/ui/button'` to imports.

Replace around line 31:
```tsx
// BEFORE
<button
  className="px-4 py-2 bg-indigo-500 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
  onClick={() => router.push(...)}
>
  Editar serviço
</button>
// AFTER
<Button
  variant="primary"
  size="md"
  onClick={() => router.push(...)}
>
  Editar serviço
</Button>
```

- [ ] **Step 5: Commit**

```bash
git add \
  "packages/web/src/app/(tenant)/(app)/clients/_components/ClientDetailView.tsx" \
  "packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalDetailView.tsx" \
  "packages/web/src/app/(tenant)/(app)/admins/_components/AdminDetailView.tsx" \
  "packages/web/src/app/(tenant)/(app)/settings/services/_components/ServiceDetailView.tsx"
git commit -m "feat(web): migrate detail view action buttons to unified Button"
```

---

### Task 9: Update list pages

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentFilters.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/clients/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/admins/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/settings/services/page.tsx`

The chevron SVGs used in pagination:
```tsx
// Left chevron (Anterior)
const ChevronLeft = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
// Right chevron (Próxima — rendered as child after text, not icon prop)
const ChevronRight = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
```

The plus SVG for "Novo X" buttons:
```tsx
const PlusIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
```

- [ ] **Step 1: Update `appointments/page.tsx`**

Add `import { Button } from '@/components/ui/button'` to imports.

The view mode toggle (Calendar/Listagem segmented buttons) is **out of scope** — do not change it.

"Novo agendamento" button (around line 141):
```tsx
// BEFORE
<button
  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
  onClick={() => router.push('/appointments/create')}
>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
  Novo agendamento
</button>
// AFTER
<Button
  variant="primary"
  size="md"
  icon={
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  }
  onClick={() => router.push('/appointments/create')}
>
  Novo agendamento
</Button>
```

Table "Cancelar" button (around line 238):
```tsx
// BEFORE
<button
  className="px-3 py-[5px] bg-red-500 text-white rounded-md text-[12px] font-medium cursor-pointer hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  onClick={() => setCancelTarget({ id: appt.id, startsAt: appt.startsAt })}
>
  Cancelar
</button>
// AFTER
<Button
  variant="destructive"
  size="xs"
  onClick={() => setCancelTarget({ id: appt.id, startsAt: appt.startsAt })}
>
  Cancelar
</Button>
```

Pagination (around lines 258–278):
```tsx
// BEFORE
<button
  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-border bg-background text-foreground rounded-md text-[13px] font-medium cursor-pointer hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  onClick={() => setPage(p => p - 1)}
  disabled={page <= 1}
>
  <svg width="14" ...><polyline points="15 18 9 12 15 6"/></svg>
  Anterior
</button>
<button
  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-border bg-background text-foreground rounded-md text-[13px] font-medium cursor-pointer hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  onClick={() => setPage(p => p + 1)}
  disabled={page >= totalPages}
>
  Próxima
  <svg width="14" ...><polyline points="9 18 15 12 9 6"/></svg>
</button>
// AFTER
<Button
  variant="secondary"
  size="sm"
  icon={
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  }
  onClick={() => setPage(p => p - 1)}
  disabled={page <= 1}
>
  Anterior
</Button>
<Button
  variant="secondary"
  size="sm"
  onClick={() => setPage(p => p + 1)}
  disabled={page >= totalPages}
>
  Próxima
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
</Button>
```

- [ ] **Step 2: Update `AppointmentFilters.tsx`**

Add `import { Button } from '@/components/ui/button'` to imports.

"Limpar filtros" button (around line 147):
```tsx
// BEFORE
<button
  className="h-9 px-3.5 border border-border bg-background text-muted-foreground rounded-lg text-[13px] font-medium cursor-pointer hover:bg-accent hover:text-foreground transition-colors whitespace-nowrap"
  onClick={onClearFilters}
>
  Limpar filtros
</button>
// AFTER
<Button variant="secondary" size="sm" onClick={onClearFilters}>
  Limpar filtros
</Button>
```

- [ ] **Step 3: Update `clients/page.tsx`**

Add `import { Button } from '@/components/ui/button'` to imports.

"Novo cliente" button:
```tsx
// BEFORE
<button
  onClick={() => router.push('/clients/new')}
  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
>
  <svg width="14" ...>...</svg>
  Novo cliente
</button>
// AFTER
<Button
  variant="primary"
  size="md"
  icon={
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  }
  onClick={() => router.push('/clients/new')}
>
  Novo cliente
</Button>
```

"Limpar filtros" button → same as AppointmentFilters step above:
```tsx
<Button variant="secondary" size="sm" onClick={() => { setQ(''); setActive('') }}>
  Limpar filtros
</Button>
```

"Visualizar" table button:
```tsx
// BEFORE
<button
  className="px-3 py-[5px] bg-indigo-500 text-white rounded-md text-xs font-medium cursor-pointer hover:bg-indigo-600 transition-colors"
  onClick={() => router.push(`/clients/${client.id}`)}
>
  Visualizar
</button>
// AFTER
<Button variant="primary" size="xs" onClick={() => router.push(`/clients/${client.id}`)}>
  Visualizar
</Button>
```

Pagination → same pattern as appointments, replace both prev/next buttons.

- [ ] **Step 4: Update `professionals/page.tsx`**

Add `import { Button } from '@/components/ui/button'` to imports.

"Novo profissional", "Limpar filtros", "Visualizar" table button, and pagination — all same patterns as clients/page.tsx above.

Note: The AvatarName row button (`block w-full text-left bg-transparent border-0...`) is a navigation affordance, not an action button. Keep it as-is.

- [ ] **Step 5: Update `admins/page.tsx`**

Same patterns: "Novo administrador", "Limpar filtros", "Visualizar", pagination.

- [ ] **Step 6: Update `settings/services/page.tsx`**

Same patterns: "Novo serviço", "Limpar filtros" (if present), "Visualizar".

- [ ] **Step 7: Commit**

```bash
git add \
  "packages/web/src/app/(tenant)/(app)/appointments/page.tsx" \
  "packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentFilters.tsx" \
  "packages/web/src/app/(tenant)/(app)/clients/page.tsx" \
  "packages/web/src/app/(tenant)/(app)/professionals/page.tsx" \
  "packages/web/src/app/(tenant)/(app)/admins/page.tsx" \
  "packages/web/src/app/(tenant)/(app)/settings/services/page.tsx"
git commit -m "feat(web): migrate list page buttons to unified Button"
```

---

### Task 10: Build and visual verification

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript check**

Run: `cd packages/web && pnpm tsc --noEmit --skipLibCheck 2>&1 | head -50`

Expected: zero errors. If errors appear, fix them — likely a missing `import` or a variant name typo.

- [ ] **Step 2: Run Next.js build**

Run: `cd packages/web && pnpm build 2>&1 | tail -30`

Expected: build completes without errors. If it fails on a specific file, open that file and find the broken import or JSX.

- [ ] **Step 3: Start dev server and spot-check**

Run: `pnpm dev:web`

Open browser and verify these pages:
- `/appointments` — "Novo agendamento" primary button visible, pagination secondary buttons, "Cancelar" row button is now red
- `/clients` — "Novo cliente" primary button, "Visualizar" xs button in rows, pagination
- `/professionals` — form submit with spinner, ScheduleCard add/remove xs buttons
- `/settings/general` — submit button with save icon, toggle spinners still work (unchanged)
- `/settings/services` — form and detail view buttons
- BookingWizard (via `/book` route) — time slot secondary buttons, confirm primary button
- Dark mode: toggle and verify all buttons look correct (indigo primary, gray secondary border, red destructive)

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add -p
git commit -m "fix(web): correct button variant/size after build verification"
```
