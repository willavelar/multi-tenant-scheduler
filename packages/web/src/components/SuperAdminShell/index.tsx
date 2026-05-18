'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSuperAdminAuth } from '@/providers/SuperAdminAuthProvider'
import Link from 'next/link'

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useSuperAdminAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (!hydrated || isLoading) return
    // Don't redirect when on the login page
    if (!user && !pathname.includes('/login')) {
      router.replace('/login')
    }
  }, [hydrated, isLoading, user, pathname, router])

  // Show nothing while loading or redirecting (except on login page)
  if (!hydrated || isLoading) return null
  if (!user && !pathname.includes('/login')) return null

  // On login page, render without the shell UI
  if (pathname.includes('/login')) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 w-60 bg-card border-r border-border flex flex-col">
        <div className="px-6 py-5 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Super Admin</span>
        </div>
        <nav className="flex-1 p-4">
          <Link
            href="/tenants"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Tenants
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <div className="ml-60 flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
          <span className="text-sm text-muted-foreground">Plataforma Admin</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground">{user?.name}</span>
            <button
              onClick={logout}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sair
            </button>
          </div>
        </header>
        <main className="flex-1 bg-background p-7">{children}</main>
      </div>
    </div>
  )
}
