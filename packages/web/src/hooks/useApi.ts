import { useTenant } from '@/providers/TenantProvider'
import { useAuth } from '@/providers/AuthProvider'
import { apiFetch } from '@/lib/api'

export function useApi() {
  const { slug } = useTenant()
  const { accessToken } = useAuth()

  return (path: string, options: RequestInit = {}) =>
    apiFetch(path, { slug, token: accessToken, ...options })
}
