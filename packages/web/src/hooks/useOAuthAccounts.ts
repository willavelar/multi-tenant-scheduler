import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import { useTenant } from '@/providers/TenantProvider'

export type LinkedProvider = {
  provider:      'google' | 'microsoft' | 'facebook'
  providerEmail: string | null
  createdAt:     string
}

export function useOAuthAccounts() {
  const api      = useApi()
  const { slug } = useTenant()
  return useQuery<LinkedProvider[]>({
    queryKey: ['oauth-accounts', slug],
    queryFn:  () => api('/auth/oauth/linked').then((r) => r.json()),
  })
}

export function useUnlinkOAuth() {
  const api      = useApi()
  const { slug } = useTenant()
  const qc       = useQueryClient()
  return useMutation({
    mutationFn: (provider: string) =>
      api(`/auth/oauth/${provider}`, { method: 'DELETE' }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['oauth-accounts', slug] }),
  })
}
