'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  // Track whether the auth hydration from localStorage has completed
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!user) {
      router.replace('/login')
    }
  }, [hydrated, user, router])

  // Still hydrating — show nothing to avoid flash
  if (!hydrated || !user) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>
      <Sidebar />
      <div style={{ marginLeft: 260, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main style={{ flex: 1, background: '#f9fafb', padding: '28px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
