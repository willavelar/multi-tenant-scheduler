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
