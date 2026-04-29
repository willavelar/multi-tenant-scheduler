import { useTenant } from '@/providers/TenantProvider'
import { useAuth } from '@/providers/AuthProvider'
import { apiFetch, ApiError } from '@/lib/api'

export function useApi() {
  const { slug } = useTenant()
  const { accessToken, signalExpired } = useAuth()

  return (path: string, options: RequestInit = {}) =>
    apiFetch(path, { slug, token: accessToken, ...options }).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 401 && accessToken) {
        signalExpired()
      }
      throw err
    })
}
