'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
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
              {user?.role === 'professional' || user?.role === 'client' ? (
                <Link
                  href={user.role === 'professional' ? '/professionals/me' : `/clients/${user.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-[13.5px] text-gray-700 no-underline transition-colors hover:bg-gray-100"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Perfil
                </Link>
              ) : (
                <button
                  className="flex items-center gap-2 px-3.5 py-2 text-[13.5px] text-gray-700 bg-transparent border-0 cursor-default w-full text-left opacity-50"
                  disabled
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Perfil
                  <span className="ml-auto text-[10px] text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded">Em breve</span>
                </button>
              )}
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
