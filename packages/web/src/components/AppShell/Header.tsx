'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'

const PAGE_TITLES: Record<string, string> = {
  '/appointments':        'Agendamentos',
  '/appointments/create': 'Novo agendamento',
  '/clients':             'Clientes',
  '/professionals':       'Profissionais',
  '/professionals/new':   'Novo profissional',
  '/professionals/me':    'Meu perfil',
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

  // derive page title from current path
  const segment = '/' + (pathname.split('/').slice(2).join('/') || '')
  const title = PAGE_TITLES[segment] ?? 'Scheduler'

  // close dropdown on outside click
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
    <>
      <style>{`
        .header-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          font-size: 13.5px;
          color: #374151;
          cursor: pointer;
          transition: background 0.12s;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          font-family: var(--font-inter, Inter, sans-serif);
        }
        .header-menu-item:hover { background: #f3f4f6; }
        .header-menu-item.danger { color: #dc2626; }
        .header-avatar-btn {
          display: flex; align-items: center; gap: 8px;
          background: none; border: none; cursor: pointer;
          padding: 6px 8px; border-radius: 8px;
          transition: background 0.12s;
        }
        .header-avatar-btn:hover { background: #f3f4f6; }
      `}</style>

      <header style={{
        height: 64,
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        fontFamily: 'var(--font-inter, Inter, sans-serif)',
      }}>

        {/* Left: page title */}
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>
            {title}
          </h1>
        </div>

        {/* Right: user menu */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button className="header-avatar-btn" onClick={() => setOpen(v => !v)}>
            {/* Avatar circle */}
            <div style={{
              width: 34, height: 34,
              borderRadius: '50%',
              background: '#6366f1',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              flexShrink: 0,
            }}>
              {user ? initials(user.name) : '??'}
            </div>

            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.3 }}>
                {user?.name ?? '—'}
              </p>
              <p style={{ fontSize: 11, color: '#6b7280', margin: 0, lineHeight: 1.3 }}>
                {user ? roleLabel[user.role] : ''}
              </p>
            </div>

            {/* Chevron */}
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"
              style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Dropdown */}
          {open && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: 210,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
              overflow: 'hidden',
              animation: 'dropdown-in 0.15s ease both',
            }}>
              <style>{`
                @keyframes dropdown-in {
                  from { opacity: 0; transform: translateY(-6px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              {/* User info header */}
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', margin: 0 }}>{user?.name}</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{user?.email}</p>
              </div>

              <div style={{ padding: '4px 0' }}>
                <button className="header-menu-item" onClick={() => setOpen(false)} disabled>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Perfil
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#d1d5db', background: '#f9fafb', padding: '2px 6px', borderRadius: 4 }}>
                    Em breve
                  </span>
                </button>
              </div>

              <div style={{ borderTop: '1px solid #f3f4f6', padding: '4px 0' }}>
                <button className="header-menu-item danger" onClick={handleLogout}>
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
    </>
  )
}
