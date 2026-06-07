'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSuperAdminAuth } from '@/providers/SuperAdminAuthProvider'
import { ThemeToggle } from '@/components/navigation/ThemeToggle'
import { usePageTitle } from '@/hooks/usePageTitle'
import { pickColor, initials } from '@/lib/avatar'
import { cn } from '@/lib/utils'

type Crumb = { label: string; href?: string }

function getBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean)

  const STATIC: Record<string, Crumb[]> = {
    '/admin/tenants':       [{ label: 'Tenants' }],
    '/admin/tenants/new':   [{ label: 'Tenants', href: '/admin/tenants' }, { label: 'Novo tenant' }],
    '/admin/users':         [{ label: 'Usuários' }],
    '/admin/users/new':     [{ label: 'Usuários', href: '/admin/users' }, { label: 'Novo usuário' }],
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

  // /admin/users/[id]
  if (segments[1] === 'users' && segments.length === 3)
    return [{ label: 'Usuários', href: '/admin/users' }, { label: 'Visualizar usuário' }]

  // /admin/users/[id]/edit
  if (segments[1] === 'users' && segments.length === 4 && segments[3] === 'edit')
    return [{ label: 'Usuários', href: '/admin/users' }, { label: 'Editar usuário' }]

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
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const crumbs = getBreadcrumbs(pathname)
  usePageTitle(crumbs)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

      {/* Right: theme toggle + profile menu */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 bg-transparent border-0 cursor-pointer px-2 py-1.5 rounded-lg transition-colors hover:bg-accent"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-8.5 h-8.5 rounded-full object-cover shrink-0" />
            ) : (
              <div
                className="w-8.5 h-8.5 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: user ? pickColor(user.name) : '#6366f1' }}
              >
                {user ? initials(user.name) : '??'}
              </div>
            )}

            <div className="text-left">
              <p className="text-[13px] font-semibold text-foreground m-0 leading-[1.3]">{user?.name ?? '—'}</p>
              <p className="text-[11px] text-muted-foreground m-0 leading-[1.3]">Super admin</p>
            </div>

            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              className={cn('shrink-0 transition-transform duration-150 text-muted-foreground', open && 'rotate-180')}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {open && (
            <div className="absolute top-[calc(100%+6px)] right-0 w-52.5 bg-popover border border-border rounded-[10px] shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1.5 duration-150">
              <div className="px-3.5 py-3 border-b border-border">
                <p className="text-xs font-semibold text-popover-foreground m-0">{user?.name}</p>
                <p className="text-[11px] text-muted-foreground m-0 mt-0.5">{user?.email}</p>
              </div>

              <div className="py-1">
                {user && (
                  <Link
                    href={`/admin/users/${user.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-[13.5px] text-popover-foreground no-underline transition-colors hover:bg-accent"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Perfil
                  </Link>
                )}
              </div>

              <div className="border-t border-border py-1">
                <button
                  className="flex items-center gap-2 px-3.5 py-2 text-[13.5px] text-destructive bg-transparent border-0 cursor-pointer w-full text-left transition-colors hover:bg-accent"
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
