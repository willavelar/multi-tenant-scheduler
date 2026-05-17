import { useTenant } from '@/providers/TenantProvider'
import { useAuth } from '@/providers/AuthProvider'
import { apiFetch, ApiError } from '@/lib/api'

export function useApi() {
  const { slug } = useTenant()
  const { accessToken, signalExpired } = useAuth()

  return (path: string, options: RequestInit = {}) =>
    apiFetch(path, { slug, token: accessToken, ...options }).catch((err: unknown) => {
      // Safety net: if apiFetch throws 401 after a successful refresh (the retry itself was rejected),
      // sign the user out. Skip for "Session expired" which apiFetch already handled internally.
      if (err instanceof ApiError && err.status === 401 &&
          err.message !== 'Session expired' && accessToken) {
        signalExpired()
      }
      throw err
    })
}
