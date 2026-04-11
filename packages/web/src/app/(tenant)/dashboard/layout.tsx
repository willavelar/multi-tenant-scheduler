'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { Sidebar } from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user === null) return // still loading from localStorage
    if (user.role === 'client') {
      router.replace('/appointments')
    }
  }, [user, router])

  if (!user || user.role === 'client') return null

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 min-h-screen" style={{ background: '#f2efe9' }}>{children}</main>
    </div>
  )
}
