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

export async function attemptRefresh(slug: string): Promise<string> {
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
      _refreshPromise ??= attemptRefresh(slug).finally(() => { _refreshPromise = null })
      const newToken = await _refreshPromise
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${API_URL}${path}`, { ...options, headers })
    } catch {
      _onSessionExpired()
      throw new ApiError(401, 'Session expired')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, body.message ?? res.statusText, body)
  }

  return res
}
