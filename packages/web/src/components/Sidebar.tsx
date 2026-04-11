'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  roles: Array<'tenant_admin' | 'professional' | 'client'>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: '📅 Agendamentos', roles: ['tenant_admin', 'professional'] },
  { href: '/dashboard/professionals', label: '👤 Profissionais', roles: ['tenant_admin'] },
  { href: '/dashboard/services', label: '🛠 Serviços', roles: ['tenant_admin'] },
  { href: '/dashboard/availability', label: '🕐 Disponibilidade', roles: ['tenant_admin', 'professional'] },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  if (!user) return null

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role as 'tenant_admin' | 'professional'))

  function handleLogout() {
    logout()
    router.push('/login')
  }

  return (
    <div className="w-56 min-h-screen bg-slate-900 text-slate-300 flex flex-col p-4">
      <div className="mb-6">
        <p className="text-white font-bold text-sm">{user.email}</p>
        <p className="text-slate-500 text-xs capitalize">{user.role.replace('_', ' ')}</p>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? 'page' : undefined}
            className={cn(
              'block px-3 py-2 rounded-md text-sm transition-colors',
              pathname === item.href
                ? 'bg-indigo-600 text-white font-semibold'
                : 'hover:bg-slate-800'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-red-400 hover:text-red-300 hover:bg-slate-800 mt-4 justify-start"
      >
        ↩ Sair
      </Button>
    </div>
  )
}
