'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { superAdminFetch } from '@/lib/super-admin-api'

type SuperAdminUser = {
  id: string
  email: string
  name: string
  role: 'super_admin'
}

type JwtPayload = {
  sub: string
  email: string
  name: string
  role: string
  tenantId: null
  exp: number
}

type SuperAdminAuthContextValue = {
  user: SuperAdminUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextValue | null>(null)

function tokenToUser(token: string): SuperAdminUser {
  const payload = jwtDecode<JwtPayload>(token)
  if (payload.exp * 1000 < Date.now()) throw new Error('Token expired')
  if (payload.role !== 'super_admin') throw new Error('Not a super admin')
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    role: 'super_admin',
  }
}

export function SuperAdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SuperAdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('sa-token')
    if (token) {
      try {
        setUser(tokenToUser(token))
      } catch {
        localStorage.removeItem('sa-token')
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await superAdminFetch('/super-admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    const { accessToken } = await res.json()
    localStorage.setItem('sa-token', accessToken)
    setUser(tokenToUser(accessToken))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('sa-token')
    setUser(null)
  }, [])

  return (
    <SuperAdminAuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </SuperAdminAuthContext.Provider>
  )
}

export function useSuperAdminAuth() {
  const ctx = useContext(SuperAdminAuthContext)
  if (!ctx) throw new Error('useSuperAdminAuth must be used inside SuperAdminAuthProvider')
  return ctx
}
