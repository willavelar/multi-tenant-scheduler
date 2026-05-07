# Skeleton Loading States — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every "Carregando..." text with skeleton loading components across all modules.

**Architecture:** Create one `Skeleton` primitive + three composites (`TableSkeleton`, `DetailSkeleton`, `FormSkeleton`) in `components/ui/`. Pages and cards import the appropriate composite or the primitive directly for unique layouts.

**Tech Stack:** React, Tailwind CSS, shadcn/ui conventions, TanStack Query (`isLoading`)

---

## File Map

**Create:**
- `packages/web/src/components/ui/skeleton.tsx`
- `packages/web/src/components/ui/TableSkeleton.tsx`
- `packages/web/src/components/ui/DetailSkeleton.tsx`
- `packages/web/src/components/ui/FormSkeleton.tsx`

**Modify (replace "Carregando..."):**
- `packages/web/src/app/(tenant)/(app)/admins/page.tsx`
- `packages/web/src/app/(tenant)/(app)/admins/[id]/page.tsx`
- `packages/web/src/app/(tenant)/(app)/admins/[id]/edit/page.tsx`
- `packages/web/src/app/(tenant)/(app)/clients/page.tsx`
- `packages/web/src/app/(tenant)/(app)/clients/[id]/page.tsx`
- `packages/web/src/app/(tenant)/(app)/clients/[id]/edit/page.tsx`
- `packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx`
- `packages/web/src/app/(tenant)/(app)/professionals/page.tsx`
- `packages/web/src/app/(tenant)/(app)/professionals/[id]/page.tsx`
- `packages/web/src/app/(tenant)/(app)/professionals/[id]/edit/page.tsx`
- `packages/web/src/app/(tenant)/(app)/professionals/_components/ScheduleCard.tsx`
- `packages/web/src/app/(tenant)/(app)/professionals/_components/ExceptionsCard.tsx`
- `packages/web/src/app/(tenant)/(app)/settings/services/page.tsx`
- `packages/web/src/app/(tenant)/(app)/settings/services/[id]/page.tsx`
- `packages/web/src/app/(tenant)/(app)/settings/services/[id]/edit/page.tsx`
- `packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx`
- `packages/web/src/app/(tenant)/(app)/me/page.tsx`
- `packages/web/src/app/(tenant)/(app)/appointments/page.tsx`
- `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarView.tsx`
- `packages/web/src/app/(tenant)/(app)/appointments/create/page.tsx`
- `packages/web/src/components/BookingWizard/StepProfessional.tsx`
- `packages/web/src/components/BookingWizard/StepService.tsx`
- `packages/web/src/components/BookingWizard/StepDateTime.tsx`

---

## Task 1 — Skeleton primitive

**Files:**
- Create: `packages/web/src/components/ui/skeleton.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />
}
```

- [ ] **Step 2: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/skeleton.tsx
git commit -m "feat(web): add Skeleton primitive component"
```

---

## Task 2 — TableSkeleton composite

**Files:**
- Create: `packages/web/src/components/ui/TableSkeleton.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  cols: number
  rows?: number
}

export function TableSkeleton({ cols, rows = 8 }: Props) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="border-b border-border">
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-4 py-3 text-left">
              <Skeleton className="h-3 w-16 opacity-60" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, row) => (
          <tr key={row} className="border-b border-border">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-3 w-28" />
              </div>
            </td>
            {Array.from({ length: cols - 1 }).map((_, col) => (
              <td key={col} className="px-4 py-3">
                <Skeleton className="h-3 w-20" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/TableSkeleton.tsx
git commit -m "feat(web): add TableSkeleton composite"
```

---

## Task 3 — DetailSkeleton composite

**Files:**
- Create: `packages/web/src/components/ui/DetailSkeleton.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { DetailCard } from '@/components/ui/DetailCard'

type Props = {
  fields?: number
}

export function DetailSkeleton({ fields = 8 }: Props) {
  return (
    <div>
      <div className="flex justify-between items-center mb-7">
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex items-center gap-4 mb-7">
        <Skeleton className="w-14 h-14 rounded-full shrink-0" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-52" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <DetailCard>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex py-3.5 border-b border-border last:border-b-0">
            <Skeleton className="h-3 w-[130px] shrink-0" />
            <Skeleton className="h-3 w-48 ml-8" />
          </div>
        ))}
      </DetailCard>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/DetailSkeleton.tsx
git commit -m "feat(web): add DetailSkeleton composite"
```

---

## Task 4 — FormSkeleton composite

**Files:**
- Create: `packages/web/src/components/ui/FormSkeleton.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  fields?: number
}

export function FormSkeleton({ fields = 6 }: Props) {
  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/FormSkeleton.tsx
git commit -m "feat(web): add FormSkeleton composite"
```

---

## Task 5 — Admins module

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/admins/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/admins/[id]/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/admins/[id]/edit/page.tsx`

### admins/page.tsx

- [ ] **Step 1: Add import at the top of the file (after existing imports)**

```tsx
import { TableSkeleton } from '@/components/ui/TableSkeleton'
```

- [ ] **Step 2: Replace the loading state inside the table card**

Find:
```tsx
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Carregando...</div>
```

Replace with:
```tsx
        {isLoading ? (
          <TableSkeleton cols={5} />
```

### admins/[id]/page.tsx

- [ ] **Step 3: Add import**

```tsx
import { DetailSkeleton } from '@/components/ui/DetailSkeleton'
```

- [ ] **Step 4: Replace the loading early return**

Find:
```tsx
  if (isLoading) return <div className="p-12 text-muted-foreground text-sm">Carregando...</div>
```

Replace with:
```tsx
  if (isLoading) return <DetailSkeleton />
```

### admins/[id]/edit/page.tsx

- [ ] **Step 5: Add import**

```tsx
import { FormSkeleton } from '@/components/ui/FormSkeleton'
```

- [ ] **Step 6: Split the combined guard and replace the loading state**

Find:
```tsx
  if (isLoading || !admin) {
    return <div className="p-12 text-muted-foreground text-sm">Carregando...</div>
  }
```

Replace with:
```tsx
  if (isLoading) return <FormSkeleton />
  if (!admin)    return <div className="p-12 text-muted-foreground text-sm">Administrador não encontrado.</div>
```

- [ ] **Step 7: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
git add "packages/web/src/app/(tenant)/(app)/admins/page.tsx" \
        "packages/web/src/app/(tenant)/(app)/admins/[id]/page.tsx" \
        "packages/web/src/app/(tenant)/(app)/admins/[id]/edit/page.tsx"
git commit -m "feat(web): skeleton loading in admins module"
```

---

## Task 6 — Clients module

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/clients/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/clients/[id]/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/clients/[id]/edit/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx`

### clients/page.tsx

- [ ] **Step 1: Add import**

```tsx
import { TableSkeleton } from '@/components/ui/TableSkeleton'
```

- [ ] **Step 2: Replace loading state**

Find:
```tsx
          <div className="p-12 text-center text-muted-foreground text-sm">Carregando...</div>
```

Replace with:
```tsx
          <TableSkeleton cols={7} />
```

### clients/[id]/page.tsx

- [ ] **Step 3: Add import**

```tsx
import { DetailSkeleton } from '@/components/ui/DetailSkeleton'
```

- [ ] **Step 4: Replace loading early return**

Find:
```tsx
  if (isLoading) return <div className="p-12 text-muted-foreground text-sm">Carregando...</div>
```

Replace with:
```tsx
  if (isLoading) return <DetailSkeleton />
```

### clients/[id]/edit/page.tsx

- [ ] **Step 5: Add import**

```tsx
import { FormSkeleton } from '@/components/ui/FormSkeleton'
```

- [ ] **Step 6: Split guard and replace**

Find:
```tsx
  if (isLoading || !client) {
    return <div className="p-12 text-muted-foreground text-sm">Carregando...</div>
  }
```

Replace with:
```tsx
  if (isLoading) return <FormSkeleton />
  if (!client)   return <div className="p-12 text-muted-foreground text-sm">Cliente não encontrado.</div>
```

### clients/_components/ClientForm.tsx

- [ ] **Step 7: Add import**

```tsx
import { FormSkeleton } from '@/components/ui/FormSkeleton'
```

- [ ] **Step 8: Replace loading state**

Find:
```tsx
  if (!initialized) return <div className="p-12 text-muted-foreground text-sm">Carregando...</div>
```

Replace with:
```tsx
  if (!initialized) return <FormSkeleton />
```

- [ ] **Step 9: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add "packages/web/src/app/(tenant)/(app)/clients/page.tsx" \
        "packages/web/src/app/(tenant)/(app)/clients/[id]/page.tsx" \
        "packages/web/src/app/(tenant)/(app)/clients/[id]/edit/page.tsx" \
        "packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx"
git commit -m "feat(web): skeleton loading in clients module"
```

---

## Task 7 — Professionals module (pages)

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/[id]/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/[id]/edit/page.tsx`

### professionals/page.tsx

- [ ] **Step 1: Add import**

```tsx
import { TableSkeleton } from '@/components/ui/TableSkeleton'
```

- [ ] **Step 2: Replace loading state**

Find:
```tsx
          <div className="p-12 text-center text-muted-foreground text-sm">Carregando...</div>
```

Replace with:
```tsx
          <TableSkeleton cols={7} />
```

### professionals/[id]/page.tsx

- [ ] **Step 3: Add import**

```tsx
import { DetailSkeleton } from '@/components/ui/DetailSkeleton'
```

- [ ] **Step 4: Replace loading early return**

Find:
```tsx
  if (isLoading) return <div className="p-12 text-muted-foreground text-sm">Carregando...</div>
```

Replace with:
```tsx
  if (isLoading) return <DetailSkeleton />
```

### professionals/[id]/edit/page.tsx

- [ ] **Step 5: Add import**

```tsx
import { FormSkeleton } from '@/components/ui/FormSkeleton'
```

- [ ] **Step 6: Split guard and replace**

Find:
```tsx
  if (isLoading || !prof) {
    return <div className="p-12 text-muted-foreground text-sm">Carregando...</div>
  }
```

Replace with:
```tsx
  if (isLoading) return <FormSkeleton />
  if (!prof)     return <div className="p-12 text-muted-foreground text-sm">Profissional não encontrado.</div>
```

- [ ] **Step 7: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add "packages/web/src/app/(tenant)/(app)/professionals/page.tsx" \
        "packages/web/src/app/(tenant)/(app)/professionals/[id]/page.tsx" \
        "packages/web/src/app/(tenant)/(app)/professionals/[id]/edit/page.tsx"
git commit -m "feat(web): skeleton loading in professionals pages"
```

---

## Task 8 — Professionals cards (ScheduleCard + ExceptionsCard)

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/_components/ScheduleCard.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/_components/ExceptionsCard.tsx`

### ScheduleCard.tsx — Edit mode (first occurrence, ~line 197)

- [ ] **Step 1: Add import at top of file**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
```

- [ ] **Step 2: Replace edit-mode loading state**

Find (inside `ScheduleCardEdit` return):
```tsx
      {isLoading ? (
        <div className="text-[13px] text-muted-foreground">Carregando...</div>
      ) : (
```

Replace with:
```tsx
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-4 w-8 shrink-0 mt-1" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ) : (
```

### ScheduleCard.tsx — View mode (second occurrence, ~line 277)

- [ ] **Step 3: Replace view-mode loading state**

Find (inside `ScheduleCardView` return):
```tsx
      {isLoading ? (
        <div className="text-[13px] text-muted-foreground">Carregando...</div>
      ) : (
```

Replace with:
```tsx
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-4 w-8 shrink-0 mt-1" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ) : (
```

### ExceptionsCard.tsx — First occurrence (~line 274)

- [ ] **Step 4: Add import at top of ExceptionsCard.tsx**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
```

- [ ] **Step 5: Replace first loading state (inside the ExceptionsCard main return)**

Find:
```tsx
      {isLoading ? (
        <div className="text-[13px] text-muted-foreground">Carregando...</div>
      ) : (
```

Replace with:
```tsx
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : (
```

Note: ExceptionsCard has two separate loading blocks — verify with `grep -n "Carregando" ExceptionsCard.tsx` before making the second replacement to confirm the line numbers.

- [ ] **Step 6: Replace second loading state (second occurrence)**

Both occurrences in ExceptionsCard have the same wrapping pattern. Since Step 5 uses the Edit tool targeting the first occurrence, use `replace_all: true` on Step 5 (or repeat the same edit) to catch both. Alternatively, after Step 5 replaces the first one, grep again to confirm only one "Carregando..." remains, then repeat the same find-replace for the second.

```tsx
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : (
```

- [ ] **Step 7: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add "packages/web/src/app/(tenant)/(app)/professionals/_components/ScheduleCard.tsx" \
        "packages/web/src/app/(tenant)/(app)/professionals/_components/ExceptionsCard.tsx"
git commit -m "feat(web): skeleton loading in ScheduleCard and ExceptionsCard"
```

---

## Task 9 — Settings module (services + TenantGeneralForm)

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/settings/services/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/settings/services/[id]/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/settings/services/[id]/edit/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx`

### settings/services/page.tsx

- [ ] **Step 1: Add import**

```tsx
import { TableSkeleton } from '@/components/ui/TableSkeleton'
```

- [ ] **Step 2: Replace loading state**

Find:
```tsx
          <div className="p-12 text-center text-muted-foreground text-sm">Carregando...</div>
```

Replace with:
```tsx
          <TableSkeleton cols={5} />
```

### settings/services/[id]/page.tsx

- [ ] **Step 3: Add import**

```tsx
import { DetailSkeleton } from '@/components/ui/DetailSkeleton'
```

- [ ] **Step 4: Replace loading early return**

Find:
```tsx
  if (isLoading) return <div className="p-12 text-muted-foreground text-sm">Carregando...</div>
```

Replace with:
```tsx
  if (isLoading) return <DetailSkeleton fields={5} />
```

### settings/services/[id]/edit/page.tsx

- [ ] **Step 5: Add import**

```tsx
import { FormSkeleton } from '@/components/ui/FormSkeleton'
```

- [ ] **Step 6: Replace loading early return**

Find:
```tsx
    return <div className="p-12 text-muted-foreground text-sm">Carregando...</div>
```

Replace with:
```tsx
    return <FormSkeleton fields={4} />
```

### settings/_components/TenantGeneralForm.tsx

- [ ] **Step 7: Add import**

```tsx
import { FormSkeleton } from '@/components/ui/FormSkeleton'
```

- [ ] **Step 8: Replace loading early return**

Find:
```tsx
  if (isLoading) return <div className="p-12 text-muted-foreground text-sm">Carregando...</div>
```

Replace with:
```tsx
  if (isLoading) return <FormSkeleton fields={5} />
```

- [ ] **Step 9: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add "packages/web/src/app/(tenant)/(app)/settings/services/page.tsx" \
        "packages/web/src/app/(tenant)/(app)/settings/services/[id]/page.tsx" \
        "packages/web/src/app/(tenant)/(app)/settings/services/[id]/edit/page.tsx" \
        "packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx"
git commit -m "feat(web): skeleton loading in settings module"
```

---

## Task 10 — Me page

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/me/page.tsx`

The `me/page.tsx` file has three separate sub-components (`AdminMe`, `ProfessionalMe`, `ClientMe`), each with its own `isLoading` guard. Replace each.

- [ ] **Step 1: Add import**

```tsx
import { DetailSkeleton } from '@/components/ui/DetailSkeleton'
```

- [ ] **Step 2: Replace in AdminMe**

Find:
```tsx
  if (isLoading) return <div className="p-12 text-muted-foreground text-sm">Carregando...</div>
  if (!admin)    return <div className="p-12 text-muted-foreground text-sm">Perfil não encontrado.</div>
```

Replace with:
```tsx
  if (isLoading) return <DetailSkeleton />
  if (!admin)    return <div className="p-12 text-muted-foreground text-sm">Perfil não encontrado.</div>
```

- [ ] **Step 3: Replace in ProfessionalMe**

Find:
```tsx
  if (isLoading) return <div className="p-12 text-muted-foreground text-sm">Carregando...</div>
  if (!prof)     return <div className="p-12 text-muted-foreground text-sm">Perfil não encontrado.</div>
```

Replace with:
```tsx
  if (isLoading) return <DetailSkeleton />
  if (!prof)     return <div className="p-12 text-muted-foreground text-sm">Perfil não encontrado.</div>
```

- [ ] **Step 4: Replace in ClientMe**

Find:
```tsx
  if (isLoading) return <div className="p-12 text-muted-foreground text-sm">Carregando...</div>
  if (!client)   return <div className="p-12 text-muted-foreground text-sm">Perfil não encontrado.</div>
```

Replace with:
```tsx
  if (isLoading) return <DetailSkeleton />
  if (!client)   return <div className="p-12 text-muted-foreground text-sm">Perfil não encontrado.</div>
```

- [ ] **Step 5: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add "packages/web/src/app/(tenant)/(app)/me/page.tsx"
git commit -m "feat(web): skeleton loading in me/profile page"
```

---

## Task 11 — Appointments list + calendar

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarView.tsx`

### appointments/page.tsx

- [ ] **Step 1: Add import**

```tsx
import { TableSkeleton } from '@/components/ui/TableSkeleton'
```

- [ ] **Step 2: Replace loading state**

Find:
```tsx
              <div className="p-12 text-center text-muted-foreground text-sm">Carregando...</div>
```

Replace with:
```tsx
              <TableSkeleton cols={7} />
```

### appointments/_components/CalendarView.tsx

- [ ] **Step 3: Add import**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
```

- [ ] **Step 4: Replace the overlay text with pulsing blocks**

Find:
```tsx
        {isLoading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-20">
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        )}
```

Replace with:
```tsx
        {isLoading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-20">
            <div className="flex flex-col gap-2 w-32">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        )}
```

- [ ] **Step 5: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add "packages/web/src/app/(tenant)/(app)/appointments/page.tsx" \
        "packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarView.tsx"
git commit -m "feat(web): skeleton loading in appointments list and calendar"
```

---

## Task 12 — Appointments create wizard

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/create/page.tsx`

There are three loading states in this file: services, professionals, and time slots.

- [ ] **Step 1: Add import**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
```

- [ ] **Step 2: Replace services loading state (~line 235)**

Find:
```tsx
            loadingServices || (isAdminOrProfessional && loadingProfile && !!clientId) ? (
              <p className="text-[13px] text-muted-foreground">Carregando...</p>
```

Replace with:
```tsx
            loadingServices || (isAdminOrProfessional && loadingProfile && !!clientId) ? (
              <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-3.5 py-3 border border-border rounded-lg">
                    <Skeleton className="h-4 w-3/4 mb-1.5" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
```

- [ ] **Step 3: Replace professionals loading state (~line 268)**

Find:
```tsx
            loadingProfs || (isAdminOrProfessional && loadingProfile && !!clientId) ? (
              <p className="text-[13px] text-muted-foreground">Carregando...</p>
```

Replace with:
```tsx
            loadingProfs || (isAdminOrProfessional && loadingProfile && !!clientId) ? (
              <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-3.5 py-3 border border-border rounded-lg">
                    <Skeleton className="h-9 w-9 rounded-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
```

- [ ] **Step 4: Replace time slots loading state (~line 322)**

Find:
```tsx
                {loadingSlots ? (
                  <p className="text-[13px] text-muted-foreground">Carregando horários...</p>
```

Replace with:
```tsx
                {loadingSlots ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-16 rounded-lg" />
                    ))}
                  </div>
```

- [ ] **Step 5: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add "packages/web/src/app/(tenant)/(app)/appointments/create/page.tsx"
git commit -m "feat(web): skeleton loading in appointments create wizard"
```

---

## Task 13 — BookingWizard steps

**Files:**
- Modify: `packages/web/src/components/BookingWizard/StepProfessional.tsx`
- Modify: `packages/web/src/components/BookingWizard/StepService.tsx`
- Modify: `packages/web/src/components/BookingWizard/StepDateTime.tsx`

### StepProfessional.tsx

- [ ] **Step 1: Add import**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
```

- [ ] **Step 2: Replace loading early return**

Find:
```tsx
  if (isLoading) return <p className="text-muted-foreground">Carregando profissionais...</p>
```

Replace with:
```tsx
  if (isLoading) return (
    <div className="space-y-3">
      <Skeleton className="h-7 w-56" />
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border border-border rounded-xl">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
```

### StepService.tsx

- [ ] **Step 3: Add import**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
```

- [ ] **Step 4: Replace loading early return**

Find:
```tsx
  if (isLoading) return <p className="text-muted-foreground">Carregando serviços...</p>
```

Replace with:
```tsx
  if (isLoading) return (
    <div className="space-y-3">
      <Skeleton className="h-7 w-40" />
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border border-border rounded-xl">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
```

### StepDateTime.tsx

- [ ] **Step 5: Add import**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
```

- [ ] **Step 6: Replace inline loading state**

Find:
```tsx
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
```

Replace with:
```tsx
          {isLoading && (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-md" />
              ))}
            </div>
          )}
```

- [ ] **Step 7: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/components/BookingWizard/StepProfessional.tsx \
        packages/web/src/components/BookingWizard/StepService.tsx \
        packages/web/src/components/BookingWizard/StepDateTime.tsx
git commit -m "feat(web): skeleton loading in BookingWizard steps"
```
