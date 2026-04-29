import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'

export type TenantSettings = {
  id:               string
  name:             string
  slug:             string
  logoUrl:          string | null
  confirmationMode: 'auto' | 'manual'
  allowPaidStatus:  boolean
}

export function useTenantSettings() {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<TenantSettings>({
    queryKey: ['tenant-settings', slug],
    queryFn:  async () => (await api('/tenants/me')).json(),
  })
}

export function useUpdateTenantSettings() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: {
      name?:             string
      logoUrl?:          string | null
      confirmationMode?: 'auto' | 'manual'
      allowPaidStatus?:  boolean
    }) =>
      api('/tenants/me', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', slug] }),
  })
}
