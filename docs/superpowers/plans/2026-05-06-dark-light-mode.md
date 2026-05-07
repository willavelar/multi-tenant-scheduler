# Dark/Light Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent dark/light mode toggle across the entire app (header, login page) with automatic system-preference detection and no flash on load.

**Architecture:** A custom `ThemeProvider` context applies/removes the `.dark` class on `<html>`, persisting to `localStorage`. A tiny blocking inline script in `<head>` prevents the flash of wrong theme before React hydrates. Existing components are updated to use semantic Tailwind color tokens so dark mode works automatically without per-component `dark:` overrides (except for the indigo active states in the sidebar).

**Tech Stack:** Next.js 16 App Router, Tailwind v4 with custom `dark` variant, shadcn/ui semantic tokens, React context, localStorage.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `packages/web/src/providers/ThemeProvider.tsx` | Create | Theme context + `useTheme()` hook |
| `packages/web/src/components/ThemeToggle.tsx` | Create | Sun/moon toggle button |
| `packages/web/src/app/layout.tsx` | Modify | Add ThemeProvider wrapper + FOUC-prevention script |
| `packages/web/src/app/globals.css` | Modify | Set `--background` to ~gray-50 in `:root` |
| `packages/web/src/components/AppShell/Header.tsx` | Modify | Semantic colors + ThemeToggle left of user dropdown |
| `packages/web/src/components/AppShell/Sidebar.tsx` | Modify | Semantic sidebar tokens throughout |
| `packages/web/src/components/AppShell/index.tsx` | Modify | `main` area uses `bg-background` |
| `packages/web/src/app/(tenant)/login/page.tsx` | Modify | ThemeToggle top-right corner + semantic colors |

---

## Task 1: ThemeProvider

**Files:**
- Create: `packages/web/src/providers/ThemeProvider.tsx`

- [ ] **Step 1: Create the provider file**

```tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
type ThemeContextValue = { theme: Theme; toggle: () => void }

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const initial = stored ?? system
    setTheme(initial)
    document.documentElement.classList.toggle('dark', initial === 'dark')
  }, [])

  function toggle() {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/providers/ThemeProvider.tsx
git commit -m "feat(web): add ThemeProvider with localStorage persistence"
```

---

## Task 2: ThemeToggle component

**Files:**
- Create: `packages/web/src/components/ThemeToggle.tsx`

- [ ] **Step 1: Create the toggle button**

```tsx
'use client'

import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      className={cn(
        'w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent shrink-0',
        className
      )}
    >
      {theme === 'light' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/ThemeToggle.tsx
git commit -m "feat(web): add ThemeToggle sun/moon button"
```

---

## Task 3: Wire ThemeProvider into root layout + FOUC prevention

**Files:**
- Modify: `packages/web/src/app/layout.tsx`

**FOUC (Flash of Unstyled Content) problem:** The server renders without a `dark` class. React hydrates, then `useEffect` fires and applies the class — causing a visible flash. Fix: inject a tiny synchronous script into `<head>` that reads localStorage and sets the class before React paints.

**Implementation note:** Use React's raw HTML injection API on a `<script>` tag (the standard Next.js App Router pattern for FOUC prevention). The script content is a static string literal — not user input — so there is no XSS risk. Add `suppressHydrationWarning` to the `<html>` tag because the `class` attribute differs between server and client render.

The script logic (minified into one line):
```
try {
  var t = localStorage.getItem('theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch(e) {}
```

- [ ] **Step 1: Update layout.tsx**

Replace the full contents of `packages/web/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/providers/ThemeProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '700', '900'],
  style: ['normal', 'italic'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? 'TimoUp',
}

// Static string — not user input. Reads localStorage['theme']; if 'dark'
// (or absent + system prefers dark), adds 'dark' class to <html> before hydration.
const themeInitScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Blocking script — prevents flash of wrong theme before hydration */}
        <script __html={themeInitScript} />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} ${jetbrains.variable}`}
        style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

> **Note for the implementer:** The `<script __html={themeInitScript} />` placeholder above is shorthand. In the actual code, use React's raw-HTML prop on the script tag to inject `themeInitScript` as inline content. This is the standard Next.js pattern for pre-hydration scripts.

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/layout.tsx
git commit -m "feat(web): wire ThemeProvider in root layout with FOUC prevention"
```

---

## Task 4: Update globals.css — background token

**Files:**
- Modify: `packages/web/src/app/globals.css` (line 52)

The current `:root` sets `--background: oklch(1 0 0)` (pure white). After switching components from `bg-gray-50` to `bg-background`, this token must be ~gray-50 so the light mode appearance stays identical.

- [ ] **Step 1: Change `--background` in `:root`**

In `globals.css`, find the `:root` block and change only this one line:

```css
/* Before */
--background: oklch(1 0 0);

/* After */
--background: oklch(0.97 0 0);
```

Leave `--card: oklch(1 0 0)` unchanged — cards stay white and stand out from the slightly gray background.

The `.dark` block is not touched.

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/globals.css
git commit -m "feat(web): set --background to gray-50 equivalent for semantic dark mode"
```

---

## Task 5: Update AppShell/index.tsx

**Files:**
- Modify: `packages/web/src/components/AppShell/index.tsx`

- [ ] **Step 1: Replace contents**

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
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="ml-[260px] flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-background p-7">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/AppShell/index.tsx
git commit -m "feat(web): use semantic bg-background in AppShell main area"
```

---

## Task 6: Update Sidebar with semantic colors

**Files:**
- Modify: `packages/web/src/components/AppShell/Sidebar.tsx`

Key changes: `bg-white` → `bg-sidebar`, `border-gray-200`/`border-gray-100` → `border-sidebar-border`, text colors → `text-sidebar-foreground` variants, hover states → `hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`. Active nav item gets `dark:` overrides since indigo-50 doesn't adapt automatically.

- [ ] **Step 1: Replace contents**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTenant } from '@/providers/TenantProvider'
import { useAuth } from '@/providers/AuthProvider'
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
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

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-2-8 2v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  )
}

type NavItem = {
  label: string
  href:  string
  icon:  React.ReactNode
  roles: Array<'tenant_admin' | 'professional' | 'client'>
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Agendamentos',    href: '/appointments',  icon: <CalendarIcon />,  roles: ['tenant_admin', 'professional', 'client'] },
  { label: 'Clientes',        href: '/clients',       icon: <UsersIcon />,     roles: ['tenant_admin', 'professional'] },
  { label: 'Profissionais',   href: '/professionals', icon: <BriefcaseIcon />, roles: ['tenant_admin'] },
  { label: 'Administradores', href: '/admins',        icon: <ShieldIcon />,    roles: ['tenant_admin'] },
]

const SETTINGS_ITEMS: NavItem[] = [
  { label: 'Gerais',    href: '/settings/general',   icon: <SettingsIcon />, roles: ['tenant_admin'] },
  { label: 'Serviços',  href: '/settings/services',  icon: <TagIcon />,      roles: ['tenant_admin'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { slug } = useTenant()
  const { user } = useAuth()
  const { tenantName, tenantLogoUrl } = useTenantSettingsContext()

  const role = user?.role
  const items = NAV_ITEMS.filter(item => role && item.roles.includes(role))
  const settingsItems = SETTINGS_ITEMS.filter(item => role && item.roles.includes(role))

  return (
    <aside className="w-[260px] min-h-screen bg-sidebar fixed left-0 top-0 bottom-0 flex flex-col z-40 border-r border-sidebar-border">

      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          {tenantLogoUrl ? (
            <img
              src={tenantLogoUrl}
              alt={tenantName}
              className="h-9 w-auto max-w-full object-contain"
            />
          ) : (
            <>
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="16" rx="2" stroke="white" strokeWidth="2"/>
                  <path d="M8 9h8M8 13h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-[15px] font-bold text-sidebar-foreground tracking-[-0.01em]">
                {tenantName || process.env.NEXT_PUBLIC_APP_NAME || 'TimoUp'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 pt-4 flex-1">
        <p className="text-[10px] font-semibold text-sidebar-foreground/50 tracking-[0.08em] uppercase px-3 mb-2">
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
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}

        {settingsItems.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-sidebar-foreground/50 tracking-[0.08em] uppercase px-3 mb-2 mt-5">
              Configurações
            </p>
            {settingsItems.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13.5px] font-medium mb-0.5 no-underline transition-colors',
                    active
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/40 text-center">
        {slug}
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/AppShell/Sidebar.tsx
git commit -m "feat(web): update Sidebar to semantic color tokens for dark mode"
```

---

## Task 7: Update Header with semantic colors + ThemeToggle

**Files:**
- Modify: `packages/web/src/components/AppShell/Header.tsx`

Key changes: `bg-white` → `bg-card`, all gray text/border classes → semantic equivalents, dropdown `bg-white` → `bg-popover`. Add `ThemeToggle` in the right-side flex row, left of the user menu `<div>`.

- [ ] **Step 1: Replace contents**

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

type Crumb = { label: string; href?: string }

function getBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').slice(1)
  const path = '/' + segments.join('/')

  const STATIC: Record<string, Crumb[]> = {
    '/appointments':        [{ label: 'Agendamentos' }],
    '/appointments/create': [{ label: 'Agendamentos', href: '/appointments' }, { label: 'Novo agendamento' }],
    '/clients':             [{ label: 'Clientes' }],
    '/clients/new':         [{ label: 'Clientes', href: '/clients' }, { label: 'Novo cliente' }],
    '/professionals':       [{ label: 'Profissionais' }],
    '/professionals/new':   [{ label: 'Profissionais', href: '/professionals' }, { label: 'Novo profissional' }],
    '/professionals/me':    [{ label: 'Meu perfil' }],
    '/me':                  [{ label: 'Meu perfil' }],
    '/settings/general':    [{ label: 'Configurações' }, { label: 'Gerais' }],
    '/settings/services':     [{ label: 'Configurações' }, { label: 'Serviços' }],
    '/settings/services/new': [{ label: 'Configurações' }, { label: 'Serviços', href: '/settings/services' }, { label: 'Novo serviço' }],
  }

  if (STATIC[path]) return STATIC[path]

  if (segments[0] === 'settings' && segments[1] === 'services' && segments.length === 3)
    return [{ label: 'Configurações' }, { label: 'Serviços', href: '/settings/services' }, { label: 'Detalhes do serviço' }]

  if (segments[0] === 'settings' && segments[1] === 'services' && segments.length === 4 && segments[3] === 'edit')
    return [{ label: 'Configurações' }, { label: 'Serviços', href: '/settings/services' }, { label: 'Editar serviço' }]

  if (segments[0] === 'clients' && segments.length === 2)
    return [{ label: 'Clientes', href: '/clients' }, { label: 'Visualizar cliente' }]

  if (segments[0] === 'clients' && segments.length === 3 && segments[2] === 'edit')
    return [{ label: 'Clientes', href: '/clients' }, { label: 'Editar cliente' }]

  if (segments[0] === 'professionals' && segments.length === 2)
    return [{ label: 'Profissionais', href: '/professionals' }, { label: 'Profissional' }]

  return [{ label: process.env.NEXT_PUBLIC_APP_NAME ?? 'TimoUp' }]
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
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">

      {/* Left: breadcrumb */}
      <nav className="flex items-center gap-1.5">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-border">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
            {crumb.href ? (
              <button
                onClick={() => router.push(crumb.href!)}
                className="text-sm font-medium text-muted-foreground bg-transparent border-0 cursor-pointer p-0 transition-colors hover:text-indigo-500"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-sm font-semibold text-foreground">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Right: theme toggle + user menu */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 bg-transparent border-0 cursor-pointer px-2 py-1.5 rounded-lg transition-colors hover:bg-accent"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-[34px] h-[34px] rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-[34px] h-[34px] rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {user ? initials(user.name) : '??'}
              </div>
            )}

            <div className="text-left">
              <p className="text-[13px] font-semibold text-foreground m-0 leading-[1.3]">
                {user?.name ?? '—'}
              </p>
              <p className="text-[11px] text-muted-foreground m-0 leading-[1.3]">
                {user ? roleLabel[user.role] : ''}
              </p>
            </div>

            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              className={cn('shrink-0 transition-transform duration-150 text-muted-foreground', open && 'rotate-180')}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute top-[calc(100%+6px)] right-0 w-[210px] bg-popover border border-border rounded-[10px] shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1.5 duration-150">

              {/* User info header */}
              <div className="px-3.5 py-3 border-b border-border">
                <p className="text-xs font-semibold text-popover-foreground m-0">{user?.name}</p>
                <p className="text-[11px] text-muted-foreground m-0 mt-0.5">{user?.email}</p>
              </div>

              <div className="py-1">
                <Link
                  href="/me"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-[13.5px] text-popover-foreground no-underline transition-colors hover:bg-accent"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Perfil
                </Link>
              </div>

              <div className="border-t border-border py-1">
                <button
                  className="flex items-center gap-2 px-3.5 py-2 text-[13.5px] text-red-600 bg-transparent border-0 cursor-pointer w-full text-left transition-colors hover:bg-accent"
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
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/AppShell/Header.tsx
git commit -m "feat(web): add ThemeToggle to Header, update to semantic colors"
```

---

## Task 8: Update Login page with semantic colors + ThemeToggle

**Files:**
- Modify: `packages/web/src/app/(tenant)/login/page.tsx`

Key changes: outer wrapper `bg-gray-50` → `bg-background`, card `bg-white` → `bg-card`, all gray classes → semantic tokens. Add `ThemeToggle` absolutely positioned in top-right corner. Error colors: `text-red-500`/`border-red-400` → `text-destructive`/`border-destructive`.

- [ ] **Step 1: Replace contents**

```tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}

function resolveReturnTo(searchParams: ReturnType<typeof useSearchParams>): string {
  const stored = sessionStorage.getItem('session.returnTo')
  if (stored) sessionStorage.removeItem('session.returnTo')
  const urlFrom = searchParams.get('from')
  const candidate = stored ?? urlFrom ?? '/appointments'
  return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/appointments'
}

function LoginContent() {
  const { login, user } = useAuth()
  const { slug } = useTenant()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  useEffect(() => {
    if (user) router.replace('/appointments')
  }, [user, router])

  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await login(data.email, data.password, slug)
      router.push(resolveReturnTo(searchParams))
    } catch {
      setError('root', { message: 'E-mail ou senha incorretos' })
    }
  }

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-6">

      {/* Theme toggle — top-right corner */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-3 duration-300">

        {/* Heading */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-foreground m-0 mb-2 tracking-[-0.015em]">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-muted-foreground m-0">
            Acesse sua conta para continuar
          </p>
        </div>

        {/* Banner de sessão expirada */}
        {reason === 'session_expired' && (
          <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-[13px] text-amber-800 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 text-amber-500">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Sua sessão expirou. Faça login para continuar.
          </div>
        )}

        {/* Banner de senha alterada */}
        {reason === 'password_reset' && (
          <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-[13px] text-green-800 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 text-green-500">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Senha alterada com sucesso. Faça login para continuar.
          </div>
        )}

        {/* Banner de conta ativada */}
        {reason === 'account_activated' && (
          <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-[13px] text-green-800 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 text-green-500">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Senha cadastrada com sucesso. Faça login para continuar.
          </div>
        )}

        {/* Card */}
        <div className="bg-card rounded-xl p-8 border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* E-mail */}
            <div className="mb-4.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-foreground mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                {...register('email')}
                className={cn(
                  'w-full h-[46px] px-3.5 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border placeholder:text-muted-foreground',
                  errors.email ? 'border-destructive' : 'border-border',
                )}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1.5 duration-200">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Senha */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="text-[13px] font-medium text-foreground">
                  Senha
                </label>
                <a
                  href="./forgot-password"
                  className="text-xs text-muted-foreground no-underline hover:text-foreground underline-offset-4 hover:underline"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                  className={cn(
                    'w-full h-[46px] pl-3.5 pr-[42px] text-sm text-foreground bg-background rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border placeholder:text-muted-foreground',
                    errors.password ? 'border-destructive' : 'border-border',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground hover:text-foreground hover:scale-110 active:scale-90 transition-all bg-transparent border-0 p-0 cursor-pointer"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1.5 duration-200">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Erro global */}
            {errors.root && (
              <div className="mb-4 px-3 py-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-[13px] text-destructive flex items-center gap-2 animate-in fade-in slide-in-from-top-1.5 duration-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {errors.root.message}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[46px] bg-blue-600 text-white font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-65 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? <><Spinner />Entrando...</> : 'Entrar'}
            </button>

          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-5 text-[13px] text-muted-foreground">
          Ainda não tem conta?{' '}
          <a
            href="./register"
            className="text-blue-600 font-semibold no-underline hover:underline"
          >
            Cadastre-se
          </a>
        </p>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/(tenant)/login/page.tsx
git commit -m "feat(web): add ThemeToggle to login page, update to semantic colors"
```

---

## Task 9: Verify in browser

- [ ] **Step 1: Start the web dev server**

```bash
pnpm dev:web
```

Open `http://localhost:3000/<tenant-slug>/login`

- [ ] **Step 2: Verify login page**

Check:
- ThemeToggle appears in the top-right corner (sun icon in light mode)
- Clicking it switches to dark mode (moon icon appears, background goes dark)
- Refreshing preserves the chosen theme — no flash of wrong theme
- Dark mode: background dark, card slightly lighter, text light, borders subtle
- Light mode: matches original (gray-50 background, white card, dark text)

- [ ] **Step 3: Log in and verify app shell**

Check:
- Header shows ThemeToggle to the left of the user dropdown
- Sidebar background adapts in both modes
- Active nav item (indigo highlight) looks correct in light and dark
- User dropdown (popover) uses dark card background in dark mode
- Main content area background adapts correctly

- [ ] **Step 4: Final commit if any tweaks were needed**

```bash
git add -p
git commit -m "fix(web): dark mode visual tweaks"
```
