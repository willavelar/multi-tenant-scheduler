# Alert Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a reusable `Alert` component with CVA variants and replace all inline alert `<div>` blocks across auth pages and `CancellationDeadlineBanner`.

**Architecture:** Single `Alert` component in `packages/web/src/components/ui/Alert.tsx` using `class-variance-authority` (same pattern as `button.tsx`). Variants (`warning`, `success`, `error`, `info`) and sizes (`md` for page banners, `sm` for inline form errors) are declared via CVA. Consumers pass `variant`, `size`, optional `title`, `children`, and `className` for external spacing.

**Tech Stack:** React, TypeScript, Tailwind CSS, `class-variance-authority` (already installed — used by `button.tsx`)

---

## File Map

| Action | Path |
|---|---|
| Modify | `packages/web/src/components/ui/Alert.tsx` (replace empty stub) |
| Modify | `packages/web/src/app/(tenant)/login/page.tsx` |
| Modify | `packages/web/src/app/(tenant)/register/page.tsx` |
| Modify | `packages/web/src/app/(tenant)/forgot-password/page.tsx` |
| Modify | `packages/web/src/app/(tenant)/reset-password/page.tsx` |
| Modify | `packages/web/src/app/(tenant)/activate-account/page.tsx` |
| Modify | `packages/web/src/app/(tenant)/(app)/appointments/_components/CancellationDeadlineBanner.tsx` |

---

## Task 1: Implement Alert.tsx

**Files:**
- Modify: `packages/web/src/components/ui/Alert.tsx`

- [ ] **Step 1: Replace the empty stub with the full implementation**

```tsx
'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'flex border animate-in fade-in slide-in-from-top-2 duration-300',
  {
    variants: {
      variant: {
        warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500 dark:border-amber-500 dark:text-white',
        success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-500 dark:border-green-500 dark:text-white',
        error:   'bg-red-50 border-red-200 text-red-700 dark:bg-red-500 dark:border-red-500 dark:text-white',
        info:    'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-500 dark:border-blue-500 dark:text-white',
      },
      size: {
        md: 'rounded-xl px-4 py-3 gap-2.5 text-[13px]',
        sm: 'rounded-lg px-3 py-2.5 gap-2 text-[13px]',
      },
    },
    defaultVariants: {
      variant: 'error',
      size: 'md',
    },
  }
)

const ICON_CLASS: Record<string, string> = {
  warning: 'text-amber-500 dark:text-white',
  success: 'text-green-500 dark:text-white',
  error:   '',
  info:    'text-blue-500 dark:text-white',
}

const ICONS: Record<string, React.ReactNode> = {
  warning: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  success: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
}

type AlertProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    title?: string
  }

function Alert({ variant = 'error', size = 'md', title, children, className, ...props }: AlertProps) {
  const hasTitle = !!title
  const v = variant ?? 'error'
  return (
    <div
      role="alert"
      className={cn(
        alertVariants({ variant, size }),
        hasTitle ? 'items-start' : 'items-center',
        className,
      )}
      {...props}
    >
      <span className={cn('shrink-0', ICON_CLASS[v], hasTitle && 'mt-0.5')}>
        {ICONS[v]}
      </span>
      {hasTitle ? (
        <div>
          <p className="font-semibold leading-snug m-0">{title}</p>
          <p className="mt-0.5 leading-snug m-0 opacity-90">{children}</p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

export { Alert, alertVariants }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd packages/web && pnpm tsc --noEmit 2>&1 | head -30`
Expected: no errors referencing `Alert.tsx`

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/Alert.tsx
git commit -m "feat(web): implement Alert component with CVA variants"
```

---

## Task 2: Replace alerts in login/page.tsx

**Files:**
- Modify: `packages/web/src/app/(tenant)/login/page.tsx`

There are 4 inline alert blocks to replace:
- Lines ~81–89: warning banner (`session_expired`)
- Lines ~93–100: success banner (`password_reset`)
- Lines ~104–111: success banner (`account_activated`)
- Lines ~183–191: error form alert (`errors.root`)

- [ ] **Step 1: Add the Alert import at the top of the file**

In `login/page.tsx`, add this import alongside the existing ui imports:

```tsx
import { Alert } from '@/components/ui/Alert'
```

- [ ] **Step 2: Replace the session_expired banner (lines ~81–89)**

Remove:
```tsx
<div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-[13px] text-amber-800 dark:bg-amber-500 dark:border-amber-500 dark:text-white flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 text-amber-500 dark:text-white">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
  Sua sessão expirou. Faça login para continuar.
</div>
```

Replace with:
```tsx
<Alert variant="warning" className="mb-5">
  Sua sessão expirou. Faça login para continuar.
</Alert>
```

- [ ] **Step 3: Replace the password_reset banner (lines ~93–100)**

Remove:
```tsx
<div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-[13px] text-green-800 dark:bg-green-500 dark:border-green-500 dark:text-white flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 text-green-500 dark:text-white">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
  Senha alterada com sucesso. Faça login para continuar.
</div>
```

Replace with:
```tsx
<Alert variant="success" className="mb-5">
  Senha alterada com sucesso. Faça login para continuar.
</Alert>
```

- [ ] **Step 4: Replace the account_activated banner (lines ~104–111)**

Remove:
```tsx
<div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-[13px] text-green-800 dark:bg-green-500 dark:border-green-500 dark:text-white flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 text-green-500 dark:text-white">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
  Senha cadastrada com sucesso. Faça login para continuar.
</div>
```

Replace with:
```tsx
<Alert variant="success" className="mb-5">
  Senha cadastrada com sucesso. Faça login para continuar.
</Alert>
```

- [ ] **Step 5: Replace the form root error (lines ~183–191)**

Remove:
```tsx
<div className="mb-4 px-3 py-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-[13px] text-destructive flex items-center gap-2 animate-in fade-in slide-in-from-top-1.5 duration-200">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
  {errors.root.message}
</div>
```

Replace with:
```tsx
<Alert variant="error" size="sm" className="mb-4">
  {errors.root.message}
</Alert>
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd packages/web && pnpm tsc --noEmit 2>&1 | head -30`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add "packages/web/src/app/(tenant)/login/page.tsx"
git commit -m "feat(web): replace inline alerts in login page with Alert component"
```

---

## Task 3: Replace form error alert in register/page.tsx

**Files:**
- Modify: `packages/web/src/app/(tenant)/register/page.tsx`

- [ ] **Step 1: Add Alert import**

Add alongside existing ui imports:
```tsx
import { Alert } from '@/components/ui/Alert'
```

- [ ] **Step 2: Replace the form root error (lines ~205–213)**

Remove:
```tsx
<div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 dark:bg-red-500 dark:border-red-500 dark:text-white flex items-center gap-2 animate-in fade-in slide-in-from-top-1.5 duration-200">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
  {errors.root.message}
</div>
```

Replace with:
```tsx
<Alert variant="error" size="sm" className="mb-4">
  {errors.root.message}
</Alert>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd packages/web && pnpm tsc --noEmit 2>&1 | head -30`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "packages/web/src/app/(tenant)/register/page.tsx"
git commit -m "feat(web): replace inline alert in register page with Alert component"
```

---

## Task 4: Replace form error alert in forgot-password/page.tsx

**Files:**
- Modify: `packages/web/src/app/(tenant)/forgot-password/page.tsx`

- [ ] **Step 1: Add Alert import**

Add alongside existing ui imports:
```tsx
import { Alert } from '@/components/ui/Alert'
```

- [ ] **Step 2: Replace the form root error (lines ~112–120)**

Remove:
```tsx
<div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 dark:bg-red-500 dark:border-red-500 dark:text-white flex items-center gap-2 animate-in fade-in slide-in-from-top-1.5 duration-200">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
  {errors.root.message}
</div>
```

Replace with:
```tsx
<Alert variant="error" size="sm" className="mb-4">
  {errors.root.message}
</Alert>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd packages/web && pnpm tsc --noEmit 2>&1 | head -30`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "packages/web/src/app/(tenant)/forgot-password/page.tsx"
git commit -m "feat(web): replace inline alert in forgot-password page with Alert component"
```

---

## Task 5: Replace form error alert in reset-password/page.tsx

**Files:**
- Modify: `packages/web/src/app/(tenant)/reset-password/page.tsx`

- [ ] **Step 1: Add Alert import**

Add alongside existing ui imports:
```tsx
import { Alert } from '@/components/ui/Alert'
```

- [ ] **Step 2: Replace the form root error (lines ~244–261)**

Remove:
```tsx
<div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 dark:bg-red-500 dark:border-red-500 dark:text-white flex items-center gap-2 animate-in fade-in slide-in-from-top-1.5 duration-200">
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    className="shrink-0"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
  {errors.root.message}
</div>
```

Replace with:
```tsx
<Alert variant="error" size="sm" className="mb-4">
  {errors.root.message}
</Alert>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd packages/web && pnpm tsc --noEmit 2>&1 | head -30`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "packages/web/src/app/(tenant)/reset-password/page.tsx"
git commit -m "feat(web): replace inline alert in reset-password page with Alert component"
```

---

## Task 6: Replace form error alert in activate-account/page.tsx

**Files:**
- Modify: `packages/web/src/app/(tenant)/activate-account/page.tsx`

- [ ] **Step 1: Add Alert import**

Add alongside existing ui imports:
```tsx
import { Alert } from '@/components/ui/Alert'
```

- [ ] **Step 2: Replace the form root error (lines ~219–227)**

Remove:
```tsx
<div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 dark:bg-red-500 dark:border-red-500 dark:text-white flex items-center gap-2 animate-in fade-in slide-in-from-top-1.5 duration-200">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
  {errors.root.message}
</div>
```

Replace with:
```tsx
<Alert variant="error" size="sm" className="mb-4">
  {errors.root.message}
</Alert>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd packages/web && pnpm tsc --noEmit 2>&1 | head -30`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "packages/web/src/app/(tenant)/activate-account/page.tsx"
git commit -m "feat(web): replace inline alert in activate-account page with Alert component"
```

---

## Task 7: Refactor CancellationDeadlineBanner.tsx

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/_components/CancellationDeadlineBanner.tsx`

- [ ] **Step 1: Add Alert import**

Add at the top of the file:
```tsx
import { Alert } from '@/components/ui/Alert'
```

- [ ] **Step 2: Replace the inline warning div in the return statement**

The current return at line ~54 is:
```tsx
return (
  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-[13px]">
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5 text-amber-500">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    <div>
      <p className="font-semibold text-amber-800 leading-snug m-0">Lembrete: prazo de cancelamento</p>
      <p className="text-amber-700 mt-0.5 leading-snug m-0">
        Você tem agendamentos próximos. O cancelamento deve ser feito com pelo menos{' '}
        <strong>{cancellationDeadlineValue} {unitLabel}</strong> de antecedência.
      </p>
    </div>
  </div>
)
```

Replace with:
```tsx
return (
  <Alert variant="warning" title="Lembrete: prazo de cancelamento" className="mb-4">
    Você tem agendamentos próximos. O cancelamento deve ser feito com pelo menos{' '}
    <strong>{cancellationDeadlineValue} {unitLabel}</strong> de antecedência.
  </Alert>
)
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd packages/web && pnpm tsc --noEmit 2>&1 | head -30`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "packages/web/src/app/(tenant)/(app)/appointments/_components/CancellationDeadlineBanner.tsx"
git commit -m "feat(web): refactor CancellationDeadlineBanner to use Alert component"
```

---

## Verification

After all tasks are done, start the dev server and visually verify the following:

```bash
pnpm dev:web
```

Open `http://localhost:3000/<any-slug>/login` in the browser and check:

1. **`?reason=session_expired`** → amber warning banner appears above the card
2. **`?reason=password_reset`** → green success banner appears above the card
3. **`?reason=account_activated`** → green success banner appears above the card
4. Submit the login form with wrong credentials → red error alert appears inside the card (compact, `size="sm"`)
5. Toggle dark mode (ThemeToggle) → all banners switch to solid colored backgrounds with white text
6. Navigate to `/register`, submit with mismatched passwords → `errors.root` red alert appears inside the card
7. Visit the appointments page as a client with a configured cancellation deadline → `CancellationDeadlineBanner` renders with title + description layout, amber warning style
