const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export class SuperAdminApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function superAdminFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sa_accessToken') : null
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new SuperAdminApiError(res.status, body.message ?? res.statusText)
  }

  return res
}

export type SuggestionStatus = 'new' | 'resolved'

export interface SuggestionListItem {
  id: string
  tenantId: string
  tenantName: string | null
  userName: string
  userEmail: string
  content: string
  status: SuggestionStatus
  createdAt: string
}

export interface SuggestionDetail extends SuggestionListItem {
  imageUrl: string | null
}

export interface SuggestionsPage {
  data: SuggestionListItem[]
  total: number
  page: number
  limit: number
}

export async function listSuggestions(page: number, limit: number, status?: SuggestionStatus): Promise<SuggestionsPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) params.set('status', status)
  const res = await superAdminFetch(`/super-admin/suggestions?${params.toString()}`)
  return res.json()
}

export async function getSuggestion(id: string): Promise<SuggestionDetail> {
  const res = await superAdminFetch(`/super-admin/suggestions/${id}`)
  return res.json()
}

export async function updateSuggestionStatus(id: string, status: SuggestionStatus): Promise<SuggestionDetail> {
  const res = await superAdminFetch(`/super-admin/suggestions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return res.json()
}

export async function deleteSuggestion(id: string): Promise<void> {
  await superAdminFetch(`/super-admin/suggestions/${id}`, { method: 'DELETE' })
}

export interface SuperAdminUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  active: boolean
  createdAt: string
}

export interface SuperAdminUsersPage {
  data: SuperAdminUser[]
  total: number
  page: number
  limit: number
}

export async function listSuperAdminUsers(
  page: number,
  limit: number,
  filters: { q?: string; active?: string } = {},
): Promise<SuperAdminUsersPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (filters.q) params.set('q', filters.q)
  if (filters.active) params.set('active', filters.active)
  const res = await superAdminFetch(`/super-admin/users?${params.toString()}`)
  return res.json()
}

export async function getSuperAdminUser(id: string): Promise<SuperAdminUser> {
  const res = await superAdminFetch(`/super-admin/users/${id}`)
  return res.json()
}

export async function createSuperAdminUser(payload: {
  name: string
  email: string
  password: string
  avatarUrl?: string | null
}): Promise<SuperAdminUser> {
  const res = await superAdminFetch('/super-admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function updateSuperAdminUser(id: string, payload: {
  name?: string
  avatarUrl?: string | null
  active?: boolean
  password?: string
}): Promise<SuperAdminUser> {
  const res = await superAdminFetch(`/super-admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return res.json()
}
