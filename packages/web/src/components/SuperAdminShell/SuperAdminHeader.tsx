'use client'

import { useRouter } from 'next/navigation'
import { useSuperAdminAuth } from '@/providers/SuperAdminAuthProvider'
import { ThemeToggle } from '@/components/ThemeToggle'

export function SuperAdminHeader() {
  const { user, logout } = useSuperAdminAuth()
  const router = useRouter()

  function handleLogout() {
    logout()
    router.push('/admin/login')
  }

  return (
    <header className="h-18 bg-card border-b border-border flex items-center justify-end px-6 sticky top-0 z-30 gap-3">
      <ThemeToggle />
      <div className="h-5 w-px bg-border" />
      <span className="text-[13px] text-muted-foreground">{user?.email}</span>
      <button
        onClick={handleLogout}
        className="text-[13px] text-destructive bg-transparent border-0 cursor-pointer hover:underline p-0"
      >
        Sair
      </button>
    </header>
  )
}
