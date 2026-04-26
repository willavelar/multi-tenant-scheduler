const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message)
  }
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

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, body.message ?? res.statusText, body)
  }

  return res
}
