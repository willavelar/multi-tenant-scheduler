# Tailwind Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all inline `style={{}}` and `<style>` JSX blocks in `packages/web/src` to Tailwind v4 utility classes, using `cn()` and shadcn/ui primitives. Extract five recurring layout patterns into shared components. Document the rule in CLAUDE.md.

**Architecture:** Tailwind v4 (`@import "tailwindcss"`) and shadcn/ui are already installed in `packages/web` and configured in `globals.css` — no new dependencies. `cn()` lives in `@/lib/utils`. `tw-animate-css` is already imported in `globals.css`, providing `animate-in`, `fade-in`, `slide-in-from-top-*` utilities. `StatusBadge` gets a breaking API change (replaces raw hex props with a `variant` enum); all callers are updated in the same task. The only legitimate `style={{}}` exceptions are JS-computed values that can't be expressed as Tailwind classes: `AvatarName`'s `pickColor()` output, `size`, and derived `fontSize`.

**Tech Stack:** Tailwind v4, shadcn/ui (`@/components/ui/`), `cn()` from `@/lib/utils`, `tw-animate-css`.

---

## File Map

**New files:**
- `packages/web/src/components/ui/EmptyState.tsx`
- `packages/web/src/components/ui/PageHeader.tsx`
- `packages/web/src/components/ui/DetailCard.tsx`
- `packages/web/src/components/ui/FieldRow.tsx`
- `packages/web/src/components/ui/DangerZone.tsx`

**Modified files:**
- `CLAUDE.md` (root)
- `packages/web/CLAUDE.md`
- `packages/web/src/components/ui/DateTimeCell.tsx`
- `packages/web/src/components/ui/BackButton.tsx`
- `packages/web/src/components/ui/StatusBadge.tsx`
- `packages/web/src/components/ui/AvatarName.tsx`
- `packages/web/src/components/AppShell/index.tsx`
- `packages/web/src/components/AppShell/Sidebar.tsx`
- `packages/web/src/components/AppShell/Header.tsx`
- `packages/web/src/app/(tenant)/(app)/professionals/page.tsx`
- `packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx`
- `packages/web/src/app/(tenant)/(app)/professionals/[id]/page.tsx`
- `packages/web/src/app/(tenant)/(app)/clients/page.tsx`
- `packages/web/src/app/(tenant)/(app)/clients/[id]/page.tsx`
- `packages/web/src/app/(tenant)/(app)/clients/new/page.tsx`
- `packages/web/src/app/(tenant)/(app)/clients/[id]/edit/page.tsx`
- `packages/web/src/app/(tenant)/(app)/appointments/page.tsx`
- `packages/web/src/app/(tenant)/(app)/appointments/create/page.tsx`
- `packages/web/src/app/(tenant)/login/page.tsx`
- `packages/web/src/app/(tenant)/register/page.tsx`

---

## Quick Reference: Style → Tailwind mapping

Use this table throughout all tasks.

| Inline style | Tailwind class |
|---|---|
| `display:'flex'` | `flex` |
| `alignItems:'center'` | `items-center` |
| `justifyContent:'space-between'` | `justify-between` |
| `justifyContent:'center'` | `justify-center` |
| `flexDirection:'column'` | `flex-col` |
| `flexWrap:'wrap'` | `flex-wrap` |
| `flex:1` | `flex-1` |
| `flexShrink:0` | `shrink-0` |
| `gap:6` | `gap-1.5` |
| `gap:8` | `gap-2` |
| `gap:10` | `gap-2.5` |
| `gap:12` | `gap-3` |
| `gap:16` | `gap-4` |
| `gap:24` | `gap-6` |
| `minHeight:'100vh'` | `min-h-screen` |
| `width:'100%'` | `w-full` |
| `position:'fixed'` | `fixed` |
| `position:'sticky'` | `sticky` |
| `position:'absolute'` | `absolute` |
| `position:'relative'` | `relative` |
| `inset:0` | `inset-0` |
| `top:0` | `top-0` |
| `left:0` | `left-0` |
| `bottom:0` | `bottom-0` |
| `zIndex:50` | `z-50` |
| `zIndex:40` | `z-40` |
| `zIndex:30` | `z-30` |
| `overflow:'hidden'` | `overflow-hidden` |
| `overflowX:'auto'` | `overflow-x-auto` |
| `borderRadius:8` | `rounded-lg` |
| `borderRadius:10` | `rounded-[10px]` |
| `borderRadius:12` | `rounded-xl` |
| `borderRadius:20 / '50%'` | `rounded-full` |
| `border:'1px solid #e5e7eb'` | `border border-gray-200` |
| `border:'1px solid #f3f4f6'` | `border border-gray-100` |
| `border:'1px solid #fecaca'` | `border border-red-200` |
| `borderBottom:'1px solid #e5e7eb'` | `border-b border-gray-200` |
| `borderTop:'1px solid #e5e7eb'` | `border-t border-gray-200` |
| `boxShadow:'0 1px 3px rgba(0,0,0,0.04)'` | `shadow-sm` |
| `boxShadow:'0 8px 24px rgba(0,0,0,0.10)'` | `shadow-lg` |
| `boxShadow:'0 20px 60px rgba(0,0,0,0.18)'` | `shadow-2xl` |
| `background:'#fff'` | `bg-white` |
| `background:'#f9fafb'` | `bg-gray-50` |
| `background:'#f3f4f6'` | `bg-gray-100` |
| `background:'#6366f1'` | `bg-indigo-500` |
| `background:'#4f46e5'` | `bg-indigo-600` |
| `background:'#dc2626'` | `bg-red-600` |
| `background:'#0f172a'` | `bg-slate-900` |
| `background:'none'` | `bg-transparent` |
| `color:'#111827'` | `text-gray-900` |
| `color:'#374151'` | `text-gray-700` |
| `color:'#6b7280'` | `text-gray-500` |
| `color:'#9ca3af'` | `text-gray-400` |
| `color:'#6366f1'` | `text-indigo-500` |
| `color:'#dc2626'` | `text-red-600` |
| `color:'#b91c1c'` | `text-red-700` |
| `color:'#166534'` | `text-green-800` |
| `color:'#fff'` | `text-white` |
| `fontSize:12` | `text-xs` |
| `fontSize:13/13.5` | `text-[13px]` / `text-[13.5px]` |
| `fontSize:14` | `text-sm` |
| `fontSize:16` | `text-base` |
| `fontSize:18` | `text-lg` |
| `fontWeight:500` | `font-medium` |
| `fontWeight:600` | `font-semibold` |
| `fontWeight:700` | `font-bold` |
| `textTransform:'uppercase'` | `uppercase` |
| `letterSpacing:'0.06em'` | `tracking-[0.06em]` |
| `whiteSpace:'nowrap'` | `whitespace-nowrap` |
| `whiteSpace:'pre-wrap'` | `whitespace-pre-wrap` |
| `textAlign:'center'` | `text-center` |
| `textAlign:'left'` | `text-left` |
| `cursor:'pointer'` | `cursor-pointer` |
| `cursor:'not-allowed'` | `cursor-not-allowed` |
| `userSelect:'none'` | `select-none` |
| `transition:'background 0.15s'` | `transition-colors` |
| `transition:'background 0.12s, color 0.12s'` | `transition-colors` |
| `resize:'vertical'` | `resize-y` |
| `borderCollapse:'collapse'` | `border-collapse` |
| `marginBottom:4` | `mb-1` |
| `marginBottom:6` | `mb-1.5` |
| `marginBottom:8` | `mb-2` |
| `marginBottom:12` | `mb-3` |
| `marginBottom:16` | `mb-4` |
| `marginBottom:20` | `mb-5` |
| `marginBottom:24` | `mb-6` |
| `marginBottom:28` | `mb-7` |
| `marginLeft:260` | `ml-[260px]` |
| `padding:'28px'` | `p-7` |
| `padding:'0 24px'` | `px-6` |
| `padding:'12px 16px'` | `px-4 py-3` |
| `padding:'20px 24px'` | `px-6 py-5` |
| `padding:'12px 14px'` | `px-3.5 py-3` |
| `padding:'3px 10px'` | `px-2.5 py-0.5` |
| `padding:'8px 16px'` | `px-4 py-2` |
| `animation:'spin 0.75s linear infinite'` | `animate-spin` |
| `@keyframes dropdown-in { from { opacity:0; transform:translateY(-6px) } }` | `animate-in fade-in slide-in-from-top-1.5 duration-150` (tw-animate-css) |
| `@keyframes auth-fade-up { from { opacity:0; transform:translateY(12px) } }` | `animate-in fade-in slide-in-from-bottom-3 duration-300` |
| JS focus state (`onFocus`/`onBlur` + `style={{border: focused ? ... : ...}}`) | Remove JS state; use `focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none` on input |
| `backgroundImage: url("data:image/svg+xml,...")` on select | Wrap select in `<div className="relative">`, add absolute SVG chevron |
| `onMouseEnter`/`onMouseLeave` for hover colors | Remove; use `hover:` Tailwind variants |

---

## Task 1: CLAUDE.md styling rule

**Files:**
- Modify: `CLAUDE.md` (root)
- Modify: `packages/web/CLAUDE.md`

- [ ] **Step 1: Add styling section to root CLAUDE.md**

Open `CLAUDE.md` at the root and add this section after the `## Architecture` section:

```markdown
## Styling

Use Tailwind utility classes and the `cn()` helper (`@/lib/utils`) for all styling. Use shadcn/ui components from `components/ui/` as building blocks. Avoid `style={{}}` except for values that are genuinely dynamic and cannot be expressed as a Tailwind class (e.g., a JS-computed pixel value or hex color from a runtime function like `pickColor()`). Never use `<style>` JSX blocks.
```

- [ ] **Step 2: Add styling section to packages/web/CLAUDE.md**

`packages/web/CLAUDE.md` currently only contains `@AGENTS.md`. Add the same rule:

```markdown
@AGENTS.md

## Styling

Use Tailwind utility classes and the `cn()` helper (`@/lib/utils`) for all styling. Use shadcn/ui components from `components/ui/` as building blocks. Avoid `style={{}}` except for values that are genuinely dynamic and cannot be expressed as a Tailwind class (e.g., a JS-computed pixel value or hex color from a runtime function like `pickColor()`). Never use `<style>` JSX blocks.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md packages/web/CLAUDE.md
git commit -m "docs: add Tailwind styling rule to CLAUDE.md"
```

---

## Task 2: Rewrite DateTimeCell and BackButton

**Files:**
- Modify: `packages/web/src/components/ui/DateTimeCell.tsx`
- Modify: `packages/web/src/components/ui/BackButton.tsx`

- [ ] **Step 1: Rewrite DateTimeCell**

Replace the entire file:

```tsx
type Props = {
  iso: string | null
  fallback?: string
}

export function DateTimeCell({ iso, fallback = '—' }: Props) {
  if (!iso) return <span className="text-gray-400">{fallback}</span>

  const d = new Date(iso)
  const day    = String(d.getDate()).padStart(2, '0')
  const month  = String(d.getMonth() + 1).padStart(2, '0')
  const year   = d.getFullYear()
  const hours  = String(d.getHours()).padStart(2, '0')
  const mins   = String(d.getMinutes()).padStart(2, '0')

  return (
    <span className="whitespace-nowrap text-gray-500">
      {`${day}/${month}/${year} às ${hours}:${mins}`}
    </span>
  )
}
```

- [ ] **Step 2: Rewrite BackButton**

Replace the entire file. Remove the JS `onMouseEnter`/`onMouseLeave` hover handlers — use Tailwind `hover:` variants instead:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  children: ReactNode
  /** 'border' (default) — botão com borda, usado em barras de ação.
   *  'ghost' — texto sutil sem borda, usado acima de formulários. */
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
    <button
      onClick={() => router.push(href)}
      className={cn(
        'flex items-center gap-1.5 text-[13px] font-medium text-gray-500 bg-transparent border-0 cursor-pointer transition-colors',
        variant === 'ghost'
          ? 'p-0 mb-5 hover:text-gray-700'
          : 'px-3.5 py-[7px] border border-gray-200 rounded-lg hover:bg-gray-50'
      )}
    >
      {chevron}
      {children}
    </button>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/DateTimeCell.tsx packages/web/src/components/ui/BackButton.tsx
git commit -m "refactor: migrate DateTimeCell and BackButton to Tailwind"
```

---

## Task 3: Rewrite StatusBadge (breaking API change)

**Files:**
- Modify: `packages/web/src/components/ui/StatusBadge.tsx`

This task changes the public API. Callers that pass raw hex colors (`bg`, `color`, `dot`) are updated in Tasks 12 and 14 when those files are migrated.

- [ ] **Step 1: Rewrite StatusBadge with variant API**

Replace the entire file:

```tsx
import { cn } from '@/lib/utils'

export type StatusVariant = 'success' | 'error' | 'warning' | 'purple' | 'neutral'

const VARIANT_CLASSES: Record<StatusVariant, { badge: string; dot: string }> = {
  success: { badge: 'bg-green-50 text-green-800',   dot: 'bg-green-500' },
  error:   { badge: 'bg-red-50 text-red-600',       dot: 'bg-red-500' },
  warning: { badge: 'bg-yellow-50 text-yellow-800', dot: 'bg-yellow-500' },
  purple:  { badge: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
  neutral: { badge: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
}

type Props = {
  label: string
  variant: StatusVariant
}

export function StatusBadge({ label, variant }: Props) {
  const { badge, dot } = VARIANT_CLASSES[variant]
  return (
    <span className={cn(
      'inline-flex items-center gap-[5px] px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap',
      badge
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/ui/StatusBadge.tsx
git commit -m "refactor: StatusBadge — new variant API replacing raw hex props"
```

---

## Task 4: Rewrite AvatarName

**Files:**
- Modify: `packages/web/src/components/ui/AvatarName.tsx`

`pickColor()` returns a JS-computed hex — this stays as `style={{ background: pickColor(name) }}`. The `size` and derived `fontSize` are also dynamic — they stay as inline style on the circle div. Everything else migrates to Tailwind.

- [ ] **Step 1: Rewrite AvatarName**

Replace the entire file:

```tsx
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']

function pickColor(str: string) {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

type Props = {
  name: string
  subtitle?: string
  size?: number
}

export function AvatarName({ name, subtitle, size = 34 }: Props) {
  const fontSize = Math.round(size * 0.35)

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-full text-white flex items-center justify-center font-bold shrink-0 select-none"
        style={{ width: size, height: size, background: pickColor(name), fontSize }}
      >
        {initials(name)}
      </div>
      <div>
        <p className="m-0 font-semibold text-xs text-gray-900 leading-[1.3]">{name}</p>
        {subtitle && (
          <p className="m-0 mt-px text-xs text-gray-400 leading-[1.3]">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/ui/AvatarName.tsx
git commit -m "refactor: migrate AvatarName to Tailwind (keep dynamic style for pickColor/size)"
```

---

## Task 5: Create EmptyState and PageHeader

**Files:**
- Create: `packages/web/src/components/ui/EmptyState.tsx`
- Create: `packages/web/src/components/ui/PageHeader.tsx`

- [ ] **Step 1: Create EmptyState**

```tsx
type Props = {
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="px-8 py-16 text-center">
      <p className="text-sm font-semibold text-gray-700 m-0 mb-1">{title}</p>
      {description && (
        <p className="text-[13px] text-gray-400 m-0 mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create PageHeader**

Used on detail and form pages: optional back button on the left, optional action button on the right.

```tsx
'use client'

import { BackButton } from './BackButton'

type Props = {
  back?: { href: string; label: string }
  action?: { label: string; onClick: () => void; variant?: 'primary' | 'destructive' }
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
        <button
          onClick={action.onClick}
          className={
            action.variant === 'destructive'
              ? 'px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 transition-colors'
              : 'px-4 py-2 bg-white text-gray-700 text-[13px] font-semibold rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors'
          }
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/EmptyState.tsx packages/web/src/components/ui/PageHeader.tsx
git commit -m "feat: add EmptyState and PageHeader shared components"
```

---

## Task 6: Create DetailCard and FieldRow

**Files:**
- Create: `packages/web/src/components/ui/DetailCard.tsx`
- Create: `packages/web/src/components/ui/FieldRow.tsx`

- [ ] **Step 1: Create DetailCard**

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
  className?: string
}

export function DetailCard({ children, className }: Props) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-xl px-6 pt-2 pb-6 mb-5 shadow-sm', className)}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create FieldRow**

```tsx
import type { ReactNode } from 'react'

type Props = {
  label: string
  value: ReactNode
}

export function FieldRow({ label, value }: Props) {
  return (
    <div className="flex py-3.5 border-b border-gray-100 last:border-b-0 text-[13.5px]">
      <span className="w-[200px] text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium flex-1">{value}</span>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/DetailCard.tsx packages/web/src/components/ui/FieldRow.tsx
git commit -m "feat: add DetailCard and FieldRow shared components"
```

---

## Task 7: Create DangerZone

**Files:**
- Create: `packages/web/src/components/ui/DangerZone.tsx`

Manages its own two-step confirm state and `pending` display internally.

- [ ] **Step 1: Create DangerZone**

```tsx
'use client'

import { useState } from 'react'

type Props = {
  title: string
  description: string
  onDelete: () => Promise<void>
  deleteLabel?: string
}

export function DangerZone({ title, description, onDelete, deleteLabel = 'Excluir' }: Props) {
  const [confirm, setConfirm] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError]     = useState('')

  async function handleDelete() {
    setPending(true)
    setError('')
    try {
      await onDelete()
    } catch {
      setError('Não foi possível excluir. Tente novamente.')
      setConfirm(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mt-2">
      <h3 className="text-sm font-bold text-red-600 m-0 mb-3">Zona de perigo</h3>
      <div className="bg-white border border-red-200 rounded-xl px-6 py-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-900 m-0 mb-1.5">{title}</p>
        <p className="text-[13px] text-gray-500 m-0 mb-4">{description}</p>

        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 transition-colors"
          >
            {deleteLabel}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-red-700 font-medium">Tem certeza?</span>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? 'Excluindo...' : 'Sim, excluir'}
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="px-4 py-2 bg-white text-gray-700 text-[13px] font-medium rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-600 mt-2.5 m-0">{error}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/ui/DangerZone.tsx
git commit -m "feat: add DangerZone shared component with two-step confirm"
```

---

## Task 8: Rewrite AppShell/index and AppShell/Sidebar

**Files:**
- Modify: `packages/web/src/components/AppShell/index.tsx`
- Modify: `packages/web/src/components/AppShell/Sidebar.tsx`

- [ ] **Step 1: Rewrite AppShell/index.tsx**

Replace the entire file:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!user) router.replace('/login')
  }, [hydrated, user, router])

  if (!hydrated || !user) return null

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-[260px] flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-gray-50 p-7">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite AppShell/Sidebar.tsx**

Remove the `<style>` block entirely. Use `cn()` with conditional active/hover classes on `<Link>`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTenant } from '@/providers/TenantProvider'
import { useAuth } from '@/providers/AuthProvider'
import { cn } from '@/lib/utils'

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="12"/>
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
  roles: Array<'tenant_admin' | 'professional' | 'client'>
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Agendamentos', href: '/appointments',     icon: <CalendarIcon />, roles: ['tenant_admin', 'professional', 'client'] },
  { label: 'Clientes',     href: '/clients',          icon: <UsersIcon />,    roles: ['tenant_admin', 'professional'] },
  { label: 'Profissionais',href: '/professionals',    icon: <BriefcaseIcon />,roles: ['tenant_admin'] },
  { label: 'Meu perfil',   href: '/professionals/me', icon: <UserIcon />,     roles: ['professional'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { slug } = useTenant()
  const { user } = useAuth()

  const items = NAV_ITEMS.filter(item =>
    user ? item.roles.includes(user.role) : false
  )

  return (
    <aside className="w-[260px] min-h-screen bg-slate-900 fixed left-0 top-0 bottom-0 flex flex-col z-40 border-r border-white/[0.05]">

      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="white" strokeWidth="2"/>
              <path d="M8 9h8M8 13h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-[15px] font-bold text-slate-100 tracking-[-0.01em]">
            Scheduler
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 pt-4 flex-1">
        <p className="text-[10px] font-semibold text-slate-500 tracking-[0.08em] uppercase px-3 mb-2">
          Menu
        </p>
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13.5px] font-medium mb-0.5 no-underline transition-colors',
                active
                  ? 'bg-indigo-500/[0.18] text-indigo-300'
                  : 'text-slate-400 hover:bg-white/[0.07] hover:text-slate-100'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.07] text-[11px] text-slate-500 text-center">
        {slug}
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/AppShell/index.tsx packages/web/src/components/AppShell/Sidebar.tsx
git commit -m "refactor: migrate AppShell and Sidebar to Tailwind"
```

---

## Task 9: Rewrite AppShell/Header

**Files:**
- Modify: `packages/web/src/components/AppShell/Header.tsx`

Remove both `<style>` blocks (including the `@keyframes dropdown-in`). Replace dropdown animation with `animate-in fade-in slide-in-from-top-1.5 duration-150` from tw-animate-css (already imported in globals.css). Replace `onMouseEnter`/`onMouseLeave` with Tailwind hover variants.

- [ ] **Step 1: Rewrite Header.tsx**

Replace the entire file:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { cn } from '@/lib/utils'

type Crumb = { label: string; href?: string }

function getBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').slice(2)
  const path = '/' + segments.join('/')

  const STATIC: Record<string, Crumb[]> = {
    '/appointments':        [{ label: 'Agendamentos' }],
    '/appointments/create': [{ label: 'Agendamentos', href: '/appointments' }, { label: 'Novo agendamento' }],
    '/clients':             [{ label: 'Clientes' }],
    '/clients/new':         [{ label: 'Clientes', href: '/clients' }, { label: 'Novo cliente' }],
    '/professionals':       [{ label: 'Profissionais' }],
    '/professionals/new':   [{ label: 'Profissionais', href: '/professionals' }, { label: 'Novo profissional' }],
    '/professionals/me':    [{ label: 'Meu perfil' }],
  }

  if (STATIC[path]) return STATIC[path]

  if (segments[0] === 'clients' && segments.length === 2)
    return [{ label: 'Clientes', href: '/clients' }, { label: 'Visualizar cliente' }]

  if (segments[0] === 'clients' && segments.length === 3 && segments[2] === 'edit')
    return [{ label: 'Clientes', href: '/clients' }, { label: 'Editar cliente' }]

  if (segments[0] === 'professionals' && segments.length === 2)
    return [{ label: 'Profissionais', href: '/professionals' }, { label: 'Profissional' }]

  return [{ label: 'Scheduler' }]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function Header() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const crumbs = getBreadcrumbs(pathname)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const roleLabel: Record<string, string> = {
    tenant_admin: 'Administrador',
    professional: 'Profissional',
    client:       'Cliente',
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">

      {/* Left: breadcrumb */}
      <nav className="flex items-center gap-1.5">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
            {crumb.href ? (
              <button
                onClick={() => router.push(crumb.href!)}
                className="text-sm font-medium text-gray-500 bg-transparent border-0 cursor-pointer p-0 transition-colors hover:text-indigo-500"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-sm font-semibold text-gray-900">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Right: user menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 bg-transparent border-0 cursor-pointer px-2 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
        >
          <div className="w-[34px] h-[34px] rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {user ? initials(user.name) : '??'}
          </div>

          <div className="text-left">
            <p className="text-[13px] font-semibold text-gray-900 m-0 leading-[1.3]">
              {user?.name ?? '—'}
            </p>
            <p className="text-[11px] text-gray-500 m-0 leading-[1.3]">
              {user ? roleLabel[user.role] : ''}
            </p>
          </div>

          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"
            className={cn('shrink-0 transition-transform duration-150', open && 'rotate-180')}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute top-[calc(100%+6px)] right-0 w-[210px] bg-white border border-gray-200 rounded-[10px] shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1.5 duration-150">

            {/* User info header */}
            <div className="px-3.5 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-900 m-0">{user?.name}</p>
              <p className="text-[11px] text-gray-400 m-0 mt-0.5">{user?.email}</p>
            </div>

            <div className="py-1">
              <button
                className="flex items-center gap-2 px-3.5 py-2 text-[13.5px] text-gray-700 bg-transparent border-0 cursor-pointer w-full text-left transition-colors hover:bg-gray-100 disabled:opacity-50"
                onClick={() => setOpen(false)}
                disabled
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Perfil
                <span className="ml-auto text-[10px] text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded">
                  Em breve
                </span>
              </button>
            </div>

            <div className="border-t border-gray-100 py-1">
              <button
                className="flex items-center gap-2 px-3.5 py-2 text-[13.5px] text-red-600 bg-transparent border-0 cursor-pointer w-full text-left transition-colors hover:bg-gray-100"
                onClick={handleLogout}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/AppShell/Header.tsx
git commit -m "refactor: migrate Header to Tailwind, replace keyframe animations with tw-animate-css"
```

---

## Task 10: Migrate professionals/page.tsx

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/page.tsx`

Uses the new `EmptyState` and `StatusBadge` (variant API).

- [ ] **Step 1: Rewrite the file**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useProfessionals, useDeleteProfessional } from '@/hooks/useProfessionals'
import { AvatarName } from '@/components/ui/AvatarName'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Professional } from '@/types'

export default function ProfessionalsPage() {
  const router = useRouter()
  const { data: professionals = [], isLoading } = useProfessionals()
  const del = useDeleteProfessional()

  function handleDelete(prof: Professional) {
    if (!confirm(`Excluir ${prof.name}? Esta ação não pode ser desfeita.`)) return
    del.mutate(prof.id)
  }

  return (
    <div className="max-w-[900px]">
      <div className="flex justify-between items-center mb-6">
        <p className="text-[13px] text-gray-500 m-0">
          {professionals.length} profissional{professionals.length !== 1 ? 'is' : ''} cadastrado{professionals.length !== 1 ? 's' : ''}
        </p>
        <button
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
          onClick={() => router.push('/professionals/new')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Cadastrar profissional
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Carregando...</div>
        ) : !professionals.length ? (
          <EmptyState
            title="Nenhum profissional"
            description='Clique em "Cadastrar profissional" para adicionar.'
          />
        ) : (
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Profissional', 'Cargo', 'Função', 'Status', 'Ações'].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {professionals.map((prof: Professional) => (
                <tr key={prof.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      className="block w-full text-left bg-transparent border-0 p-0 cursor-pointer"
                      onClick={() => router.push(`/professionals/${prof.id}`)}
                    >
                      <AvatarName name={prof.name} subtitle={prof.email} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{prof.position ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {prof.role === 'tenant_admin' ? 'Administrador' : 'Profissional'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={prof.active ? 'Ativo' : 'Inativo'}
                      variant={prof.active ? 'success' : 'neutral'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="px-3 py-[5px] border border-red-200 bg-white text-red-600 rounded-md text-xs font-medium cursor-pointer hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => handleDelete(prof)}
                      disabled={del.isPending && del.variables === prof.id}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/professionals/page.tsx
git commit -m "refactor: migrate professionals/page to Tailwind"
```

---

## Task 11: Migrate professionals/new and professionals/[id]

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/[id]/page.tsx`

### professionals/new/page.tsx

Key changes:
1. Remove `<style>` block and `@keyframes spin` — use `animate-spin` instead
2. Eliminate `focused` state, `focus()`, `blur()`, and `inputStyle()` function — replace with Tailwind focus classes
3. Replace the save button with Tailwind classes

- [ ] **Step 1: Rewrite professionals/new/page.tsx**

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter } from 'next/navigation'
import { useCreateProfessional } from '@/hooks/useProfessionals'
import { BackButton } from '@/components/ui/BackButton'
import { cn } from '@/lib/utils'

const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  email:     z.string().email('E-mail inválido'),
  password:  z.string().min(8, 'Mínimo 8 caracteres'),
  position:  z.string().optional(),
  bio:       z.string().optional(),
})
type FormData = z.infer<typeof schema>

const inputCls = (hasError: boolean) => cn(
  'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
  hasError ? 'border-red-400' : 'border-gray-200'
)

export default function NewProfessionalPage() {
  const router = useRouter()
  const create = useCreateProfessional()

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await create.mutateAsync(data)
      router.push('/professionals')
    } catch {
      setError('root', { message: 'Não foi possível cadastrar. Verifique os dados e tente novamente.' })
    }
  }

  return (
    <div className="max-w-[560px]">
      <BackButton href="/professionals" variant="ghost">Voltar para profissionais</BackButton>

      <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 m-0 mb-6">Dados do profissional</h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {[
            { key: 'name',     label: 'Nome completo', type: 'text',     required: true },
            { key: 'email',    label: 'E-mail',        type: 'email',    required: true },
            { key: 'password', label: 'Senha inicial', type: 'password', required: true },
            { key: 'position', label: 'Cargo',         type: 'text',     required: false },
          ].map(({ key, label, type, required }) => (
            <div key={key} className="mb-4">
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                {label}{required && <span className="text-red-500"> *</span>}
              </label>
              <input
                id={key}
                type={type}
                {...register(key as keyof FormData)}
                className={inputCls(!!errors[key as keyof FormData])}
              />
              {errors[key as keyof FormData] && (
                <p className="mt-1 text-xs text-red-500 m-0">
                  {errors[key as keyof FormData]?.message}
                </p>
              )}
            </div>
          ))}

          <div className="mb-6">
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              {...register('bio')}
              rows={3}
              className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none resize-y transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          {errors.root && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
              {errors.root.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[42px] bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Salvando...
              </>
            ) : 'Cadastrar profissional'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

### professionals/[id]/page.tsx

Key changes:
1. Remove `<style>` block; remove `inputCls` CSSProperties object
2. Use `DetailCard`, `FieldRow`, `DangerZone` shared components
3. Modal stays but uses Tailwind
4. Keep `pickColor()` as `style={{ background: pickColor(prof.name) }}` (legitimate dynamic)
5. `StatusBadge` uses new variant API

- [ ] **Step 2: Rewrite professionals/[id]/page.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProfessional, useUpdateProfessional, useDeleteProfessional } from '@/hooks/useProfessionals'
import { BackButton } from '@/components/ui/BackButton'
import { DetailCard } from '@/components/ui/DetailCard'
import { FieldRow } from '@/components/ui/FieldRow'
import { DangerZone } from '@/components/ui/DangerZone'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/utils'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b']
function pickColor(str: string) {
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

const ROLE_LABELS: Record<string, string> = { tenant_admin: 'Administrador', professional: 'Profissional', client: 'Cliente' }

type EditForm = { name: string; position: string; bio: string; active: boolean; role: string }

const fieldCls = 'w-full h-10 px-2.5 text-sm text-gray-900 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors'

export default function ProfessionalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: prof, isLoading } = useProfessional(id)
  const update = useUpdateProfessional(id)
  const del    = useDeleteProfessional()

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openModal() {
    if (!prof) return
    setForm({ name: prof.name, position: prof.position ?? '', bio: prof.bio ?? '', active: prof.active, role: prof.role })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    setError('')
    try {
      const patch: Record<string, unknown> = {
        name: form.name,
        position: form.position || undefined,
        bio: form.bio || undefined,
      }
      if (isAdmin) { patch.active = form.active; patch.role = form.role }
      await update.mutateAsync(patch)
      setModalOpen(false)
    } catch {
      setError('Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!prof) return
    await del.mutateAsync(prof.id)
    router.push('/professionals')
  }

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  if (!prof)    return <div className="p-12 text-gray-400 text-sm">Profissional não encontrado.</div>

  const canDelete = isAdmin && prof.userId !== me?.id

  return (
    <>
      <div className="max-w-[800px]">

        {/* Top bar */}
        <div className="flex justify-between items-start mb-7">
          <p className="text-xs text-gray-400 m-0 mt-0.5">
            Profissionais › {prof.name}
          </p>
          <BackButton href={isAdmin ? '/professionals' : '/appointments'}>
            {isAdmin ? 'Voltar para profissionais' : 'Voltar para agendamentos'}
          </BackButton>
        </div>

        {/* Identity header */}
        <div className="flex items-center gap-4 mb-7">
          <div
            className="w-14 h-14 rounded-full text-white flex items-center justify-center text-lg font-bold shrink-0"
            style={{ background: pickColor(prof.name) }}
          >
            {initials(prof.name)}
          </div>
          <div>
            <h2 className="m-0 mb-0.5 text-lg font-bold text-gray-900">{prof.name}</h2>
            <p className="m-0 mb-1 text-[13px] text-gray-500">{prof.email}</p>
            <code className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              ID: {prof.id}
            </code>
          </div>
        </div>

        {/* Profile card */}
        <DetailCard>
          <FieldRow label="Nome" value={prof.name} />
          <FieldRow label="Cargo" value={prof.position || '—'} />
          <FieldRow label="Observações" value={<span className="whitespace-pre-wrap">{prof.bio || '—'}</span>} />
          {isAdmin && (
            <>
              <FieldRow label="Função" value={ROLE_LABELS[prof.role] ?? prof.role} />
              <FieldRow label="Status" value={
                <StatusBadge label={prof.active ? 'Ativo' : 'Inativo'} variant={prof.active ? 'success' : 'neutral'} />
              } />
            </>
          )}
          <div className="mt-5">
            <button
              className="px-4 py-2 border border-gray-200 bg-white text-gray-700 text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={openModal}
            >
              Editar detalhes
            </button>
          </div>
        </DetailCard>

        {canDelete && (
          <DangerZone
            title="Excluir profissional"
            description="Esta ação excluirá permanentemente o profissional e todos os seus dados. Não pode ser desfeita."
            onDelete={handleDelete}
            deleteLabel="Excluir profissional"
          />
        )}
      </div>

      {/* Edit modal */}
      {modalOpen && form && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div className="bg-white rounded-xl p-7 w-full max-w-[480px] shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 m-0 mb-5">Editar detalhes</h3>

            {[
              { key: 'name',     label: 'Nome',  type: 'text' },
              { key: 'position', label: 'Cargo', type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key} className="mb-3.5">
                <label className="block text-[13px] font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof EditForm] as string}
                  onChange={e => setForm(f => f ? { ...f, [key]: e.target.value } : f)}
                  className={fieldCls}
                />
              </div>
            ))}

            <div className="mb-3.5">
              <label className="block text-[13px] font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => f ? { ...f, bio: e.target.value } : f)}
                rows={3}
                className="w-full px-2.5 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg outline-none resize-y focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
              />
            </div>

            {isAdmin && (
              <>
                <div className="mb-3.5">
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Função</label>
                  <div className="relative">
                    <select
                      value={form.role}
                      onChange={e => setForm(f => f ? { ...f, role: e.target.value } : f)}
                      className="w-full h-10 pl-2.5 pr-8 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
                    >
                      <option value="professional">Profissional</option>
                      <option value="tenant_admin">Administrador</option>
                    </select>
                    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                <div className="mb-3.5">
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Status</label>
                  <div className="relative">
                    <select
                      value={form.active ? 'true' : 'false'}
                      onChange={e => setForm(f => f ? { ...f, active: e.target.value === 'true' } : f)}
                      className="w-full h-10 pl-2.5 pr-8 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
              </>
            )}

            {error && <p className="text-xs text-red-600 m-0 mb-3">{error}</p>}

            <div className="flex justify-end gap-2.5 mt-6">
              <button
                className="px-4 py-[9px] border border-gray-200 bg-white text-gray-700 text-[13.5px] font-semibold rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="px-5 py-[9px] bg-indigo-500 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx \
        packages/web/src/app/(tenant)/(app)/professionals/\[id\]/page.tsx
git commit -m "refactor: migrate professionals/new and professionals/[id] to Tailwind"
```

---

## Task 12: Migrate clients/page.tsx and clients/[id]/page.tsx

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/clients/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/clients/[id]/page.tsx`

Both pages use `StatusBadge` with the old hex API — update callers to the new variant API (`variant="success"` / `variant="error"`). Both pages use `DetailCard`, `FieldRow`, and `DangerZone` shared components.

### clients/page.tsx key changes

1. Remove `<style>` block
2. `ClientStatusBadge` local helper: use `<StatusBadge label={...} variant={on ? 'success' : 'error'} />`
3. Filter inputs: remove JS focus state, add Tailwind `focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none`
4. Select filter: wrap in `<div className="relative">` with absolute SVG chevron, add `appearance-none pr-8`
5. Table rows: `hover:bg-gray-50` transition
6. Pagination buttons: use Tailwind classes
7. Empty state: use `<EmptyState>` component
8. Loading state: `<div className="p-12 text-center text-gray-400 text-sm">Carregando...</div>`

- [ ] **Step 1: Apply changes to clients/page.tsx**

Key replacements (apply throughout the file — do not add the `<style>` block):

```tsx
// Delete the entire <style> block

// ClientStatusBadge:
function ClientStatusBadge({ active }: { active: boolean | null }) {
  const on = active !== false
  return <StatusBadge label={on ? 'Ativo' : 'Inativo'} variant={on ? 'success' : 'error'} />
}

// Add EmptyState import:
import { EmptyState } from '@/components/ui/EmptyState'

// "Novo cliente" button:
<button
  onClick={() => router.push('/clients/new')}
  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
  Novo cliente
</button>

// Filters card wrapper:
<div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4 shadow-sm">

// filter-label → className:
<label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">

// filter-input on text input:
<input
  type="text"
  placeholder="Nome ou e-mail…"
  value={q}
  onChange={e => setQ(e.target.value)}
  className="h-9 w-full pl-[30px] pr-3 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
/>

// Select status filter:
<div className="relative">
  <select
    value={active}
    onChange={e => setActive(e.target.value)}
    className="h-9 w-full pl-3 pr-8 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
  >
    <option value="">Todos</option>
    <option value="true">Ativo</option>
    <option value="false">Inativo</option>
  </select>
  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
</div>

// Clear button:
<button
  className="h-9 px-3.5 bg-white text-gray-500 border border-gray-200 rounded-lg text-[13px] font-medium cursor-pointer hover:bg-gray-100 hover:text-gray-700 whitespace-nowrap transition-colors"
  onClick={() => { setQ(''); setActive('') }}
>
  Limpar filtros
</button>

// Table card wrapper:
<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

// Empty state (replace the manual div):
<EmptyState
  title="Nenhum cliente"
  description={hasFilters ? 'Nenhum cliente encontrado para os filtros aplicados.' : 'Clientes aparecerão aqui após se cadastrarem.'}
/>

// thead th:
<th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] whitespace-nowrap">

// tbody tr:
<tr className="border-b border-gray-50 transition-colors hover:bg-gray-50">

// td padding:
<td className="px-4 py-3">
<td className="px-4 py-3 text-gray-500 whitespace-nowrap">

// "Visualizar" button:
<button
  className="px-3 py-[5px] border border-indigo-100 bg-white text-indigo-500 rounded-md text-xs font-medium cursor-pointer hover:bg-indigo-50 transition-colors"
  onClick={() => router.push(`/clients/${client.id}`)}
>
  Visualizar
</button>

// Pagination wrapper:
<div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
<p className="text-[13px] text-gray-500 m-0">

// page-btn → className:
<button
  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  onClick={() => setPage(p => p - 1)}
  disabled={page <= 1}
>
```

- [ ] **Step 2: Apply changes to clients/[id]/page.tsx**

Key replacements:

```tsx
// Remove <style> block

// Add imports:
import { DetailCard } from '@/components/ui/DetailCard'
import { FieldRow } from '@/components/ui/FieldRow'
import { DangerZone } from '@/components/ui/DangerZone'

// ClientStatusBadge - same as clients/page.tsx:
function ClientStatusBadge({ active }: { active: boolean | null }) {
  const on = active !== false
  return <StatusBadge label={on ? 'Ativo' : 'Inativo'} variant={on ? 'success' : 'error'} />
}

// Top bar:
<div className="flex justify-between items-center mb-7">
  <BackButton href="/clients">Voltar para clientes</BackButton>
  {isAdmin && (
    <button
      className="px-4 py-2 bg-indigo-500 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
      onClick={() => router.push(`/clients/${id}/edit`)}
    >
      Editar cliente
    </button>
  )}
</div>

// Identity header:
<div className="flex items-center gap-4 mb-7">
  <div
    className="w-14 h-14 rounded-full text-white flex items-center justify-center text-xl font-bold shrink-0"
    style={{ background: pickColor(client.name) }}
  >
    {initials(client.name)}
  </div>
  <div>
    <h2 className="m-0 mb-0.5 text-lg font-bold text-gray-900">{client.name}</h2>
    <p className="m-0 mb-1 text-[13px] text-gray-500">{client.email}</p>
    <code className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
      ID: {client.id}
    </code>
  </div>
</div>

// Profile card — replace the manual <div style=...> with DetailCard+FieldRow:
<DetailCard>
  <FieldRow label="Nome" value={client.name} />
  <FieldRow label="E-mail" value={client.email} />
  <FieldRow label="Telefone" value={client.phone ?? '—'} />
  <FieldRow label="Data de nascimento" value={formatBirthDate(client.birthDate)} />
  <FieldRow label="Observações" value={<span className="whitespace-pre-wrap">{client.notes || '—'}</span>} />
  <FieldRow label="Status" value={<ClientStatusBadge active={client.active} />} />
  <FieldRow label="Limite de serviços" value={limitText} />
  <FieldRow label="Profissionais vinculados" value={
    client.allProfessionals ? (
      <span className="text-green-700 font-medium">Todos os profissionais</span>
    ) : client.linkedProfessionals.length === 0 ? (
      <span className="text-gray-400 font-normal">Sem restrição</span>
    ) : (
      <div className="flex flex-wrap gap-1.5">
        {client.linkedProfessionals.map(p => (
          <span key={p.professionalId} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-sky-50 border border-sky-200 rounded-full text-[12.5px] text-sky-700">
            <AvatarName name={p.name} size={18} />
          </span>
        ))}
      </div>
    )
  } />
  <FieldRow label="Serviços permitidos" value={
    client.allServices ? (
      <span className="text-green-700 font-medium">Todos os serviços</span>
    ) : client.linkedServices.length === 0 ? (
      <span className="text-gray-400 font-normal">Sem restrição</span>
    ) : (
      <div className="flex flex-wrap gap-1.5">
        {client.linkedServices.map(s => (
          <span key={s.serviceId} className="inline-flex items-center px-2.5 py-0.5 bg-violet-50 border border-violet-200 rounded-full text-[12.5px] text-violet-700">
            {s.name}
          </span>
        ))}
      </div>
    )
  } />
</DetailCard>

// Danger zone — replace manual danger zone with DangerZone component:
{isAdmin && (
  <DangerZone
    title="Excluir cliente"
    description="Esta ação excluirá permanentemente o cliente e todos os seus agendamentos. Não pode ser desfeita."
    onDelete={handleDelete}
    deleteLabel="Excluir cliente"
  />
)}
```

Note: remove the `deleteConfirm` and `deleteError` state and the manual danger zone — `DangerZone` manages its own state. The `handleDelete` function in this file should not use `confirm()` — just call `del.mutateAsync(client.id)` and navigate, letting `DangerZone`'s internal error handling display errors.

Updated `handleDelete`:
```tsx
async function handleDelete() {
  if (!client) return
  await del.mutateAsync(client.id)
  router.push('/clients')
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/clients/page.tsx \
        packages/web/src/app/(tenant)/(app)/clients/\[id\]/page.tsx
git commit -m "refactor: migrate clients/page and clients/[id] to Tailwind"
```

---

## Task 13: Migrate clients/new and clients/[id]/edit

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/clients/new/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/clients/[id]/edit/page.tsx`

Both files have the same `inputStyle()`, `labelStyle`, `sectionStyle`, `sectionTitle` objects. Both files have a `<style>` block with `@keyframes spin` and button classes.

Key changes (apply identically to both files):

1. Delete the `<style>` block
2. Delete `inputStyle()`, `labelStyle`, `sectionStyle`, `sectionTitle` objects
3. Delete `focused` state + `focus()` + `blur()` helper functions
4. Replace every `style={inputStyle(focused[k], errors.k)}` with Tailwind `cn()` approach (no JS state needed)
5. Replace `style={labelStyle}` with `className="block text-[13px] font-medium text-gray-700 mb-1.5"`
6. Replace `style={sectionStyle}` with `className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm"`
7. Replace `style={sectionTitle}` with `className="text-sm font-bold text-gray-900 m-0 mb-5"`
8. Use `animate-spin` for spinner
9. Professional chip: replace `.prof-chip` with Tailwind classes
10. Service item: replace `.svc-item` with Tailwind classes

- [ ] **Step 1: Apply changes to clients/new/page.tsx**

Replace these patterns throughout the file:

```tsx
// Remove imports of focused state management (no state variables needed for focus)
// Remove: const [focused, setFocused] = useState<Record<string, boolean>>({})
// Remove: const focus = ... const blur = ...

// Input field pattern (replace all inputStyle() usages):
// Old: <input style={inputStyle(!!focused[k], !!errors[k])} onFocus={...} onBlur={...} ... />
// New:
<input
  className={cn(
    'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
    errors[key] ? 'border-red-400' : 'border-gray-200'
  )}
  // keep value, onChange, type props — remove onFocus and onBlur
/>

// Label:
<label className="block text-[13px] font-medium text-gray-700 mb-1.5">

// Section wrapper div:
<div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">

// Section title p:
<p className="text-sm font-bold text-gray-900 m-0 mb-5">

// Error message:
<p className="text-xs text-red-500 mt-1 m-0">

// Professional chip:
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 pl-1.5 bg-blue-50 border border-blue-200 rounded-full text-[13px] text-blue-800">

// Chip remove button:
<button className="bg-transparent border-0 cursor-pointer p-0 flex items-center text-blue-300 hover:text-blue-800 transition-colors">

// Service item:
<div
  className="flex items-center gap-2.5 py-2.5 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 -mx-3 px-3 rounded-md transition-colors"
  onClick={() => toggleService(svc.id)}
>

// Submit button:
<button
  type="submit"
  disabled={create.isPending}
  className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
>
  {create.isPending ? (
    <>
      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Salvando...
    </>
  ) : 'Cadastrar cliente'}
</button>

// Cancel button:
<button
  type="button"
  className="h-[42px] px-5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
  onClick={() => router.push('/clients')}
>
  Cancelar
</button>

// Root error box:
<div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">

// Professional search dropdown:
// The dropdown <div style={{ position:'absolute', ... }}> becomes:
<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-top-1.5 duration-150">
```

- [ ] **Step 2: Apply same changes to clients/[id]/edit/page.tsx**

Same replacements as Step 1. The edit page has the same `inputStyle`, `labelStyle`, `sectionStyle`, `sectionTitle` objects and `focused` state. It does not have a `password` field. Apply all the same class replacements.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/clients/new/page.tsx \
        packages/web/src/app/(tenant)/(app)/clients/\[id\]/edit/page.tsx
git commit -m "refactor: migrate clients/new and clients/[id]/edit to Tailwind"
```

---

## Task 14: Migrate appointments/page.tsx

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/page.tsx`

This file uses `StatusBadge` with the old hex API via `STATUS_COLORS`. Map the appointment statuses to the new variants.

Key changes:

1. Remove any `<style>` blocks
2. Replace `STATUS_COLORS` hex map with a variant map for the new `StatusBadge` API
3. Replace JS focus state on filter inputs with Tailwind focus classes
4. Select fields: add `appearance-none` + absolute SVG chevron wrapper
5. Table rows: `hover:bg-gray-50`
6. Cancel modal: use Tailwind modal classes (same pattern as professionals/[id])
7. Use `EmptyState` for empty data state
8. Use `animate-spin` for any spinner

- [ ] **Step 1: Apply changes to appointments/page.tsx**

Replace these patterns throughout the file:

```tsx
// Old STATUS_COLORS map with hex values — replace with variant map:
const STATUS_VARIANTS: Record<Appointment['status'], import('@/components/ui/StatusBadge').StatusVariant> = {
  pending:   'warning',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'purple',
}

// Old StatusBadge usage:
// <StatusBadge label={STATUS_LABELS[appt.status]} bg={...} color={...} dot={...} />
// New:
<StatusBadge label={STATUS_LABELS[appt.status]} variant={STATUS_VARIANTS[appt.status]} />

// Add EmptyState import and use it:
import { EmptyState } from '@/components/ui/EmptyState'

// Filter inputs (date, service, status, client search):
// Remove onFocus/onBlur and focused state; add Tailwind focus classes:
className="h-9 w-full px-3 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"

// Service/status selects — wrap in <div className="relative"> and add chevron SVG:
<div className="relative">
  <select className="h-9 w-full pl-3 pr-8 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors">
    ...
  </select>
  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
</div>

// Client autocomplete dropdown:
<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-top-1.5 duration-150">

// Filters card:
<div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4 shadow-sm">

// Table card:
<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

// Table rows:
<tr className="border-b border-gray-50 transition-colors hover:bg-gray-50">

// Cancel modal overlay:
<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
  <div className="bg-white rounded-xl p-7 w-full max-w-[400px] shadow-2xl">

// Modal buttons:
<button className="px-4 py-[9px] border border-gray-200 bg-white text-gray-700 text-[13.5px] font-semibold rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
<button className="px-5 py-[9px] bg-red-600 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 transition-colors">

// New appointment button:
<button className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors">

// Pagination:
<button className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/appointments/page.tsx
git commit -m "refactor: migrate appointments/page to Tailwind, update StatusBadge to variant API"
```

---

## Task 15: Migrate appointments/create, login, and register

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/create/page.tsx`
- Modify: `packages/web/src/app/(tenant)/login/page.tsx`
- Modify: `packages/web/src/app/(tenant)/register/page.tsx`

### appointments/create/page.tsx

This is the booking wizard. Key changes:

1. Remove any `<style>` blocks
2. Replace all `style={{}}` with Tailwind classes
3. Any remaining `borderRadius: locked ? 12 : '12px 12px 0 0'` pattern on a JS-conditional border-radius: keep as `style={{borderRadius: ...}}` since it's conditional — or use `cn('rounded-xl', !locked && 'rounded-t-xl rounded-b-none')`

- [ ] **Step 1: Apply changes to appointments/create/page.tsx**

Replace patterns throughout:

```tsx
// Section container with conditional border radius — use cn():
className={cn(
  'bg-white border border-gray-200 shadow-sm overflow-hidden mb-4',
  locked ? 'rounded-xl' : 'rounded-t-xl'
)}

// Section header (locked vs unlocked):
className={cn(
  'flex items-center justify-between px-5 py-3.5',
  locked
    ? 'rounded-xl bg-white cursor-pointer hover:bg-gray-50 transition-colors'
    : 'rounded-t-xl bg-white border-b border-gray-200'
)}

// General style replacements (same mapping as Quick Reference table above)
// Spinner in loading states: className="animate-spin"
// Button patterns: use same Tailwind class patterns as established above
```

### login/page.tsx

Key changes:
1. Remove `<style>` block with `@keyframes auth-spin`, `auth-fade-up`, `auth-slide-down`
2. Remove `emailFocused`, `passFocused` state and their `onFocus`/`onBlur` handlers
3. Remove `borderColor()` and `shadowStyle()` functions
4. Use `animate-spin` on the Spinner component
5. Use `animate-in fade-in slide-in-from-bottom-3 duration-300` on the auth card
6. Use Tailwind focus classes on inputs directly

- [ ] **Step 2: Apply changes to login/page.tsx**

Replace patterns:

```tsx
// Remove <style> block

// Remove: emailFocused, passFocused state
// Remove: borderColor(), shadowStyle() functions
// Remove: onFocus/onBlur on inputs

// Auth card wrapper — add Tailwind animation:
<div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-3 duration-300">

// Auth card inner:
<div className="bg-white rounded-xl p-8 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">

// Page wrapper:
<div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">

// Heading:
<h1 className="text-2xl font-bold text-gray-900 m-0 mb-2 tracking-[-0.015em]">

// Input fields (remove dynamic borderColor/shadowStyle — use Tailwind focus variants):
<input
  {...register('email')}
  className={cn(
    'w-full h-[46px] px-3.5 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10',
    errors.email ? 'border-red-400' : 'border-gray-200'
  )}
/>

// Error message box (auth-slide-down animation):
<div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 animate-in fade-in slide-in-from-top-1.5 duration-200">

// Submit button:
<button
  type="submit"
  disabled={isSubmitting}
  className="w-full h-[46px] bg-blue-600 text-white font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-65 disabled:cursor-not-allowed transition-all"
>

// Spinner svg (remove inline style animation):
<svg className="animate-spin" width="16" height="16" ...>

// Password toggle button:
<button
  type="button"
  className="flex items-center text-gray-400 hover:text-gray-700 hover:scale-110 active:scale-90 transition-all"
  onClick={() => setShowPassword(v => !v)}
>
```

- [ ] **Step 3: Apply changes to register/page.tsx**

Same patterns as login/page.tsx. The register page has the same structure: `<style>` block, focus state, `borderColor`/`shadowStyle`, Spinner, auth card. Apply identical replacements.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/appointments/create/page.tsx \
        packages/web/src/app/(tenant)/login/page.tsx \
        packages/web/src/app/(tenant)/register/page.tsx
git commit -m "refactor: migrate appointments/create, login, and register to Tailwind"
```

---

## Self-review checklist

After implementing all tasks, verify:

- [ ] No `<style>` JSX blocks exist anywhere in `packages/web/src` (search: `grep -r '<style>' packages/web/src`)
- [ ] No `style={{` with static values remain (dynamic JS values like `pickColor()` output are OK — search: `grep -r "style={{" packages/web/src` and verify each remaining occurrence is a legitimate exception)
- [ ] All `StatusBadge` calls use the new `variant` prop, not `bg`/`color`/`dot`
- [ ] All `DangerZone` usages have removed the old manual confirm state from parent components
- [ ] `BackButton` no longer has `onMouseEnter`/`onMouseLeave` handlers
- [ ] All form inputs with error state use `cn()` pattern, not JS focus state
- [ ] All `<select>` elements are wrapped in `<div className="relative">` with absolute chevron SVG and have `appearance-none`
- [ ] Spinner SVGs use `className="animate-spin"` not `style={{ animation: ... }}`
- [ ] Auth card has `animate-in fade-in slide-in-from-bottom-3` animation
- [ ] Header dropdown has `animate-in fade-in slide-in-from-top-1.5` animation
