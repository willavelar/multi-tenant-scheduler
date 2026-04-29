'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { apiFetch, attemptRefresh, setOnSessionExpired } from '@/lib/api'
import type { User } from '@/types'

type JwtPayload = {
  sub: string
  email: string
  name: string
  role: 'tenant_admin' | 'professional' | 'client'
  tenantId: string | null
  exp: number
}

type UserProfileUpdate = { name?: string; avatarUrl?: string | null }

type AuthContextValue = {
  user: User | null
  accessToken: string | null
  login: (email: string, password: string, slug: string) => Promise<string>
  register: (
    data: { email: string; password: string; name: string; phone?: string },
    slug: string
  ) => Promise<string>
  logout: () => void
  updateUser: (updates: UserProfileUpdate) => void
  signalExpired: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function tokenToUser(accessToken: string): User {
  const payload = jwtDecode<JwtPayload>(accessToken)
  if (payload.exp * 1000 < Date.now()) throw new Error('Token expired')
  if (!payload.tenantId) throw new Error('Missing tenantId in token')
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
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
  const expiryFiredRef = useRef(false)

  const signalExpired = useCallback(() => {
    if (expiryFiredRef.current) return
    expiryFiredRef.current = true
    clearTokens()
    localStorage.removeItem('userProfileOverride')
    setUser(null)
    setAccessToken(null)
    const returnTo = window.location.pathname + window.location.search
    // Skip saving returnTo when already on /login to avoid a redirect loop after re-login
    if (!returnTo.startsWith('/login')) {
      sessionStorage.setItem('session.returnTo', returnTo)
    }
    window.location.replace('/login?reason=session_expired')
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('accessToken')
    if (stored) {
      try {
        const decoded = tokenToUser(stored)
        const override: UserProfileUpdate = JSON.parse(
          localStorage.getItem('userProfileOverride') || '{}'
        )
        setAccessToken(stored)
        setUser({ ...decoded, ...override })
      } catch {
        signalExpired()
      }
    }
  }, [signalExpired])

  // Wire the session-expiry callback so the interceptor in api.ts can call signalExpired
  useEffect(() => {
    setOnSessionExpired(signalExpired)
  }, [signalExpired])

  // Sync React state when a silent refresh succeeds (fired by attemptRefresh in api.ts)
  useEffect(() => {
    const handler = (e: Event) => {
      const { accessToken: newToken } = (e as CustomEvent<{ accessToken: string }>).detail
      try {
        const decoded = tokenToUser(newToken)
        const override: UserProfileUpdate = JSON.parse(
          localStorage.getItem('userProfileOverride') || '{}'
        )
        setAccessToken(newToken)
        setUser({ ...decoded, ...override })
        expiryFiredRef.current = false
      } catch {
        signalExpired()
      }
    }
    window.addEventListener('token-refreshed', handler)
    return () => window.removeEventListener('token-refreshed', handler)
  }, [signalExpired])

  // Proactive timer: refresh 1 minute before the access token expires
  useEffect(() => {
    if (!accessToken) return
    let decoded: { exp: number }
    try {
      decoded = jwtDecode<{ exp: number }>(accessToken)
    } catch {
      return
    }
    const delay = decoded.exp * 1000 - Date.now() - 60_000
    if (delay <= 0) return
    const id = setTimeout(async () => {
      const slug = window.location.pathname.split('/')[1] ?? ''
      try {
        await attemptRefresh(slug) // fires 'token-refreshed' → updates state via handler above
      } catch {
        signalExpired()
      }
    }, delay)
    return () => clearTimeout(id)
  }, [accessToken, signalExpired])

  const login = useCallback(
    async (email: string, password: string, slug: string): Promise<string> => {
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
    },
    []
  )

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

  const updateUser = useCallback((updates: UserProfileUpdate) => {
    setUser(u => {
      if (!u) return u
      const current: UserProfileUpdate = JSON.parse(
        localStorage.getItem('userProfileOverride') || '{}'
      )
      localStorage.setItem('userProfileOverride', JSON.stringify({ ...current, ...updates }))
      return { ...u, ...updates }
    })
  }, [])

  const logout = useCallback(() => {
    const rt = localStorage.getItem('refreshToken')
    if (rt) {
      const slug = window.location.pathname.split('/')[1] ?? ''
      apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: rt }),
        slug,
        token: accessToken,
      }).catch(() => {}) // fire-and-forget: local state cleared regardless
    }
    clearTokens()
    localStorage.removeItem('userProfileOverride')
    setUser(null)
    setAccessToken(null)
  }, [accessToken])

  return (
    <AuthContext.Provider
      value={{ user, accessToken, login, register, logout, updateUser, signalExpired }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
