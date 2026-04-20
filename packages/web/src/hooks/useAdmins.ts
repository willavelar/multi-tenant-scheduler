import { useQuery } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { AdminPage } from '@/types'

type AdminFilters = { q?: string; active?: string }

export function useAdmins(page = 1, filters: AdminFilters = {}) {
  const api = useApi()
  const { slug } = useTenant()
  const params = new URLSearchParams({ page: String(page), limit: '10' })
  if (filters.q)      params.set('q', filters.q)
  if (filters.active) params.set('active', filters.active)
  return useQuery<AdminPage>({
    queryKey: ['admins', slug, page, filters],
    queryFn: async () => (await api(`/admins?${params}`)).json(),
  })
}
