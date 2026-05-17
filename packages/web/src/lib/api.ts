import { jwtDecode } from 'jwt-decode'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message)
  }
}

type OnSessionExpired = () => void

let _onSessionExpired: OnSessionExpired = () => {}
let _refreshPromise: Promise<string> | null = null

export function setOnSessionExpired(cb: OnSessionExpired): void {
  _onSessionExpired = cb
}

function isAuthFailure(err: unknown): boolean {
  return err instanceof Error && (err.message === 'refresh failed' || err.message === 'no refresh token')
}

async function _doRefresh(slug: string): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) throw new Error('no refresh token')

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-slug': slug },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) throw new Error('refresh failed')

  const { accessToken, refreshToken: newRt } = await res.json()
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', newRt)
  document.cookie = `refreshToken=${newRt}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`
  window.dispatchEvent(new CustomEvent('token-refreshed', { detail: { accessToken } }))
  return accessToken
}

// Single shared promise across all callers (proactive timer + reactive interceptor + multiple tabs).
// Before refreshing, checks whether another tab already stored a fresh access token in localStorage.
export async function attemptRefresh(slug: string): Promise<string> {
  const stored = localStorage.getItem('accessToken')
  if (stored) {
    try {
      const { exp } = jwtDecode<{ exp: number }>(stored)
      // Another tab or a concurrent call already refreshed — reuse that token
      if (exp * 1000 > Date.now() + 30_000) {
        window.dispatchEvent(new CustomEvent('token-refreshed', { detail: { accessToken: stored } }))
        return stored
      }
    } catch {}
  }

  _refreshPromise ??= _doRefresh(slug).finally(() => { _refreshPromise = null })
  return _refreshPromise
}

export async function apiFetch(
  path: string,
  {
    slug,
    token,
    ...options
  }: RequestInit & { slug: string; token?: string | null }
): Promise<Response> {
  const headers: Record<string, string> = {
    'x-tenant-slug': slug,
    ...(options.headers as Record<string, string>),
  }
  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401 && token && path !== '/auth/refresh') {
    try {
      const newToken = await attemptRefresh(slug)
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${API_URL}${path}`, { ...options, headers })
    } catch (err) {
      // Only sign out if the server explicitly rejected the refresh token.
      // Network errors are transient — the reactive interceptor will retry on the next request.
      if (isAuthFailure(err)) _onSessionExpired()
      throw new ApiError(401, 'Session expired')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, body.message ?? res.statusText, body)
  }

  return res
}
