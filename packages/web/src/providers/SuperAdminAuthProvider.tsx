'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { superAdminFetch } from '@/lib/super-admin-api'
import { useRouter } from 'next/navigation'

interface SuperAdminUser {
  id: string
  email: string
  name: string
}

interface JwtPayload {
  sub: string
  email: string
  name: string
  type: string
  exp: number
}

interface SuperAdminAuthContextValue {
  user: SuperAdminUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextValue | null>(null)

function tokenToUser(token: string): SuperAdminUser | null {
  try {
    const payload = jwtDecode<JwtPayload>(token)
    if (payload.exp * 1000 < Date.now()) return null
    if (payload.type !== 'super_admin') return null
    return { id: payload.sub, email: payload.email, name: payload.name }
  } catch {
    return null
  }
}

export function SuperAdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<SuperAdminUser | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('sa_accessToken')
    if (token) setUser(tokenToUser(token))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await superAdminFetch('/super-admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    const { accessToken } = await res.json()
    localStorage.setItem('sa_accessToken', accessToken)
    setUser(tokenToUser(accessToken))
    router.replace('/_admin/tenants')
  }, [router])

  const logout = useCallback(() => {
    localStorage.removeItem('sa_accessToken')
    setUser(null)
    router.replace('/_admin/login')
  }, [router])

  return (
    <SuperAdminAuthContext.Provider value={{ user, login, logout }}>
      {children}
    </SuperAdminAuthContext.Provider>
  )
}

export function useSuperAdminAuth() {
  const ctx = useContext(SuperAdminAuthContext)
  if (!ctx) throw new Error('useSuperAdminAuth must be used inside SuperAdminAuthProvider')
  return ctx
}
