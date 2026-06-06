'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SuperAdminAuthProvider, useSuperAdminAuth } from '@/providers/SuperAdminAuthProvider'
import { SuperAdminShell } from '@/components/super-admin-shell'
import QueryProvider from '@/providers/QueryProvider'

function Inner({ children }: { children: React.ReactNode }) {
  const { user } = useSuperAdminAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (!user && !isLoginPage) router.replace('/admin/login')
  }, [user, isLoginPage, router])

  if (isLoginPage) return <>{children}</>
  if (!user) return null
  return <SuperAdminShell>{children}</SuperAdminShell>
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SuperAdminAuthProvider>
        <Inner>{children}</Inner>
      </SuperAdminAuthProvider>
    </QueryProvider>
  )
}
