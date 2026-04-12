'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTenant } from '@/providers/TenantProvider'
import { useAuth } from '@/providers/AuthProvider'

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
  { label: 'Agendamentos', href: '/appointments',    icon: <CalendarIcon />, roles: ['tenant_admin', 'professional', 'client'] },
  { label: 'Clientes',     href: '/clients',         icon: <UsersIcon />,    roles: ['tenant_admin', 'professional'] },
  { label: 'Profissionais',href: '/professionals',   icon: <BriefcaseIcon />,roles: ['tenant_admin'] },
  { label: 'Meu perfil',   href: '/professionals/me',icon: <UserIcon />,     roles: ['professional'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { slug } = useTenant()
  const { user } = useAuth()

  const items = NAV_ITEMS.filter(item =>
    user ? item.roles.includes(user.role) : false
  )

  return (
    <>
      <style>{`
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 13.5px;
          font-weight: 500;
          color: #94a3b8;
          transition: background 0.15s, color 0.15s;
          margin-bottom: 2px;
          cursor: pointer;
          border: none;
          width: 100%;
          text-align: left;
        }
        .sidebar-item:hover {
          background: rgba(255,255,255,0.07);
          color: #f1f5f9;
        }
        .sidebar-item.active {
          background: rgba(99,102,241,0.18);
          color: #a5b4fc;
        }
        .sidebar-item.active svg {
          color: #818cf8;
        }
      `}</style>

      <aside style={{
        width: 260,
        minHeight: '100vh',
        background: '#0f172a',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-inter, Inter, sans-serif)',
        zIndex: 40,
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}>

        {/* Brand */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: '#6366f1',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="white" strokeWidth="2"/>
                <path d="M8 9h8M8 13h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
              Scheduler
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 12px', marginBottom: 8 }}>
            Menu
          </p>
          {items.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href} className={`sidebar-item${active ? ' active' : ''}`}>
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '12px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          fontSize: 11,
          color: '#475569',
          textAlign: 'center',
        }}>
          {slug}
        </div>
      </aside>
    </>
  )
}
