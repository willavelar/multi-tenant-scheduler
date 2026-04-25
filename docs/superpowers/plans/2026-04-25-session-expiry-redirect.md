# Session Expiry Redirect — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detectar sessão expirada (401 da API ou JWT expirado no load) e redirecionar para o login com mensagem + retorno automático à URL anterior.

**Architecture:** `AuthProvider` expõe `signalExpired()` com dedup via ref. `useApi` captura `ApiError(401)` e chama `signalExpired()`. Login page exibe banner âmbar quando `reason=session_expired` e redireciona para `sessionStorage['session.returnTo']` após login.

**Tech Stack:** React 19, Next.js 16 App Router, TanStack Query, TypeScript, Tailwind CSS, `sessionStorage`, `window.location.replace`.

**Spec:** `docs/superpowers/specs/2026-04-25-session-expiry-redirect-design.md`

---

## File Map

| Arquivo | Mudança |
|---|---|
| `packages/web/src/providers/AuthProvider.tsx` | Adiciona `expiryFiredRef`, `signalExpired()`, expõe no contexto |
| `packages/web/src/hooks/useApi.ts` | Importa `ApiError`, captura 401, chama `signalExpired()` |
| `packages/web/src/app/(tenant)/login/page.tsx` | Banner âmbar + lógica de returnTo após login |

---

## Task 1: Adicionar `signalExpired()` ao `AuthProvider`

**Files:**
- Modify: `packages/web/src/providers/AuthProvider.tsx`

- [ ] **Step 1: Substituir o conteúdo completo do AuthProvider.tsx**

O arquivo atual está em `packages/web/src/providers/AuthProvider.tsx`. Substitua seu conteúdo inteiro por:

```tsx
'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { apiFetch } from '@/lib/api'
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
    clearTokens()
    localStorage.removeItem('userProfileOverride')
    setUser(null)
    setAccessToken(null)
  }, [])

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
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd packages/web && pnpm tsc --noEmit 2>&1 | grep -E "AuthProvider|signalExpired" | head -20
```

Esperado: sem erros relacionados a `AuthProvider` ou `signalExpired`.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/providers/AuthProvider.tsx
git commit -m "feat(web): add signalExpired to AuthProvider for session expiry handling"
```

---

## Task 2: Interceptar 401 em `useApi`

**Files:**
- Modify: `packages/web/src/hooks/useApi.ts`

- [ ] **Step 1: Substituir o conteúdo de useApi.ts**

```ts
import { useTenant } from '@/providers/TenantProvider'
import { useAuth } from '@/providers/AuthProvider'
import { apiFetch, ApiError } from '@/lib/api'

export function useApi() {
  const { slug } = useTenant()
  const { accessToken, signalExpired } = useAuth()

  return (path: string, options: RequestInit = {}) =>
    apiFetch(path, { slug, token: accessToken, ...options }).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        signalExpired()
      }
      throw err
    })
}
```

Nota: `ApiError` já é exportado de `lib/api.ts` (linha 3: `export class ApiError`). O `throw err` após `signalExpired()` é intencional — o TanStack Query deve registrar o erro normalmente mesmo que o redirect já esteja em andamento.

- [ ] **Step 2: Verificar TypeScript**

```bash
cd packages/web && pnpm tsc --noEmit 2>&1 | grep -E "useApi" | head -20
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/hooks/useApi.ts
git commit -m "feat(web): intercept 401 in useApi and signal session expiry"
```

---

## Task 3: Atualizar login page — banner + returnTo

**Files:**
- Modify: `packages/web/src/app/(tenant)/login/page.tsx`

- [ ] **Step 1: Substituir o conteúdo completo de login/page.tsx**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { cn } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}

function resolveReturnTo(searchParams: ReturnType<typeof useSearchParams>): string {
  const stored = typeof window !== 'undefined' ? sessionStorage.getItem('session.returnTo') : null
  if (stored) sessionStorage.removeItem('session.returnTo')
  const urlFrom = searchParams.get('from')
  const candidate = stored ?? urlFrom ?? '/appointments'
  return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/appointments'
}

export default function LoginPage() {
  const { login, user } = useAuth()
  const { slug } = useTenant()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  useEffect(() => {
    if (user) router.replace('/appointments')
  }, [user, router])

  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await login(data.email, data.password, slug)
      router.push(resolveReturnTo(searchParams))
    } catch {
      setError('root', { message: 'E-mail ou senha incorretos' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-3 duration-300">

        {/* Heading */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-gray-900 m-0 mb-2 tracking-[-0.015em]">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-gray-500 m-0">
            Acesse sua conta para continuar
          </p>
        </div>

        {/* Banner de sessão expirada */}
        {reason === 'session_expired' && (
          <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-[13px] text-amber-800 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 text-amber-500">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Sua sessão expirou. Faça login para continuar.
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* E-mail */}
            <div className="mb-4.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                {...register('email')}
                className={cn(
                  'w-full h-[46px] px-3.5 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border',
                  errors.email ? 'border-red-400' : 'border-gray-200',
                )}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1.5 duration-200">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Senha */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="text-[13px] font-medium text-gray-700">
                  Senha
                </label>
                <a
                  href="#"
                  className="text-xs text-blue-600 no-underline font-medium hover:underline"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                  className={cn(
                    'w-full h-[46px] pl-3.5 pr-[42px] text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border',
                    errors.password ? 'border-red-400' : 'border-gray-200',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400 hover:text-gray-700 hover:scale-110 active:scale-90 transition-all bg-transparent border-0 p-0 cursor-pointer"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1.5 duration-200">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Erro global */}
            {errors.root && (
              <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-1.5 duration-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {errors.root.message}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[46px] bg-blue-600 text-white font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-65 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? <><Spinner />Entrando...</> : 'Entrar'}
            </button>

          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-5 text-[13px] text-gray-500">
          Ainda não tem conta?{' '}
          <a
            href="./register"
            className="text-blue-600 font-semibold no-underline hover:underline"
          >
            Cadastre-se
          </a>
        </p>

      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd packages/web && pnpm tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Esperado: zero erros fora de `node_modules`.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/(tenant)/login/page.tsx
git commit -m "feat(web): show session expired banner and redirect back to previous page after login"
```

---

## Task 4: Verificação manual end-to-end

Antes de testar, certifique-se que a aplicação está rodando:

```bash
# Na raiz do monorepo
pnpm dev:api   # porta 3001
pnpm dev:web   # porta 3000
```

- [ ] **Cenário 1 — JWT expirado no load**

  1. Abra o DevTools → Application → Local Storage → defina `accessToken` para um JWT cujo `exp` já passou (você pode gerar um token adulterado ou aguardar um token real expirar).
  2. Navegue para `/appointments`.
  3. **Esperado:** Redirect imediato para `/login?reason=session_expired` com banner âmbar "Sua sessão expirou. Faça login para continuar."
  4. Faça login com credenciais válidas.
  5. **Esperado:** Redirect de volta para `/appointments`.

- [ ] **Cenário 2 — API retorna 401 em resposta a ação**

  1. Faça login normalmente.
  2. Enquanto logado, no DevTools → Application → Local Storage → delete `accessToken` (simula token inválido, mas mantém `user` em memória).
  3. Clique em qualquer ação que dispare uma chamada autenticada (ex: abrir um agendamento).
  4. **Esperado:** Redirect para `/login?reason=session_expired` com banner âmbar. O `sessionStorage['session.returnTo']` deve conter o path de onde estava.
  5. Faça login.
  6. **Esperado:** Redirect de volta para onde estava.

- [ ] **Cenário 3 — Logout manual não guarda returnTo**

  1. Faça login e navegue para `/professionals`.
  2. Clique no botão de logout.
  3. **Esperado:** Redirect para `/login` **sem** `?reason=session_expired`, sem banner. `sessionStorage['session.returnTo']` deve estar vazio.
  4. Faça login.
  5. **Esperado:** Redirect para `/appointments` (padrão), não para `/professionals`.

- [ ] **Cenário 4 — Multiple 401s concorrentes não causam loop**

  1. Simule múltiplos queries disparando 401 ao mesmo tempo (limpe `accessToken` e recarregue uma página com vários queries ativos).
  2. **Esperado:** Apenas um redirect para login, sem loops ou redirects duplicados.

- [ ] **Cenário 5 — Segurança: open redirect não é possível**

  1. Navegue manualmente para `/login?from=//evil.com`.
  2. Faça login.
  3. **Esperado:** Redirect para `/appointments` (fallback), não para `//evil.com`.
