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
