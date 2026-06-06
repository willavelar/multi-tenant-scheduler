'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useSuperAdminAuth } from '@/providers/SuperAdminAuthProvider'
import { ThemeToggle } from '@/components/navigation/ThemeToggle'

type Crumb = { label: string; href?: string }

function getBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean)

  const STATIC: Record<string, Crumb[]> = {
    '/admin/tenants':       [{ label: 'Tenants' }],
    '/admin/tenants/new':   [{ label: 'Tenants', href: '/admin/tenants' }, { label: 'Novo tenant' }],
    '/admin/suggestions':   [{ label: 'Sugestões' }],
    '/admin/settings/sso':  [{ label: 'Configurações' }, { label: 'SSO' }],
  }

  if (STATIC[pathname]) return STATIC[pathname]

  // /admin/tenants/[id]
  if (segments[1] === 'tenants' && segments.length === 3)
    return [{ label: 'Tenants', href: '/admin/tenants' }, { label: 'Visualizar tenant' }]

  // /admin/tenants/[id]/edit
  if (segments[1] === 'tenants' && segments.length === 4 && segments[3] === 'edit')
    return [{ label: 'Tenants', href: '/admin/tenants' }, { label: 'Editar tenant' }]

  // /admin/suggestions/[id]
  if (segments[1] === 'suggestions' && segments.length === 3)
    return [{ label: 'Sugestões', href: '/admin/suggestions' }, { label: 'Detalhes da sugestão' }]

  return [{ label: 'Admin Panel' }]
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function formatCurrentDate() {
  const now = new Date()
  const weekday = WEEKDAYS[now.getDay()]
  const day = String(now.getDate()).padStart(2, '0')
  const month = MONTHS[now.getMonth()]
  const year = now.getFullYear()
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return `${capitalized}, ${day} de ${month} de ${year}`
}

export function SuperAdminHeader() {
  const { user, logout } = useSuperAdminAuth()
  const router = useRouter()
  const pathname = usePathname()

  const crumbs = getBreadcrumbs(pathname)

  function handleLogout() {
    logout()
    router.push('/admin/login')
  }

  return (
    <header className="h-18 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">

      {/* Left: breadcrumb + date */}
      <div className="flex flex-col gap-0.5">
        <nav className="flex items-center gap-1.5">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-muted-foreground">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
              {crumb.href ? (
                <button
                  onClick={() => router.push(crumb.href!)}
                  className="text-[15px] font-medium text-muted-foreground bg-transparent border-0 cursor-pointer p-0 transition-colors hover:text-indigo-500"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-[15px] font-semibold text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
        <span className="text-[11px] text-muted-foreground">{formatCurrentDate()}</span>
      </div>

      {/* Right: theme toggle + user */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="h-5 w-px bg-border" />
        <span className="text-[13px] text-muted-foreground">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="text-[13px] text-destructive bg-transparent border-0 cursor-pointer hover:underline p-0"
        >
          Sair
        </button>
      </div>
    </header>
  )
}
