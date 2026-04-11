'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { apiFetch } from '@/lib/api'
import type { User } from '@/types'

type JwtPayload = {
  sub: string
  email: string
  role: 'tenant_admin' | 'professional' | 'client'
  tenantId: string | null
  exp: number
}

type AuthContextValue = {
  user: User | null
  accessToken: string | null
  login: (email: string, password: string, slug: string) => Promise<string>
  register: (
    data: { email: string; password: string; name: string; phone?: string },
    slug: string
  ) => Promise<string>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function tokenToUser(accessToken: string): User {
  const payload = jwtDecode<JwtPayload>(accessToken)
  if (payload.exp * 1000 < Date.now()) throw new Error('Token expired')
  if (!payload.tenantId) throw new Error('Missing tenantId in token')
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
  }
}

function persistTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
  document.cookie = `refreshToken=${refreshToken}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`
}

function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  document.cookie = 'refreshToken=; path=/; max-age=0'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('accessToken')
    if (stored) {
      try {
        setAccessToken(stored)
        setUser(tokenToUser(stored))
      } catch {
        clearTokens()
      }
    }
  }, [])

  const login = useCallback(async (email: string, password: string, slug: string): Promise<string> => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      slug,
    })
    const { accessToken: at, refreshToken: rt } = await res.json()
    persistTokens(at, rt)
    setAccessToken(at)
    setUser(tokenToUser(at))
    return at
  }, [])

  const register = useCallback(
    async (
      data: { email: string; password: string; name: string; phone?: string },
      slug: string
    ): Promise<string> => {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
        slug,
      })
      const { accessToken: at, refreshToken: rt } = await res.json()
      persistTokens(at, rt)
      setAccessToken(at)
      setUser(tokenToUser(at))
      return at
    },
    []
  )

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
    setAccessToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, accessToken, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
