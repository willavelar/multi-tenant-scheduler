'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSuperAdminAuth } from '@/providers/SuperAdminAuthProvider'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useSuperAdminAuth()
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r flex flex-col gap-1 p-4">
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Admin Panel
          </span>
        </div>

        <Link
          href="/_admin/tenants"
          className={cn(
            'px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname.startsWith('/_admin/tenants')
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent/50 text-muted-foreground',
          )}
        >
          Tenants
        </Link>

        <div className="mt-auto pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2 truncate">{user?.email}</p>
          <Button variant="outline" size="sm" className="w-full" onClick={logout}>
            Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
