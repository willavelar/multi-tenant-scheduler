import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { Admin, AdminPage } from '@/types'

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

export function useAdmin(id: string) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Admin>({
    queryKey: ['admins', slug, id],
    queryFn: async () => (await api(`/admins/${id}`)).json(),
    enabled: !!id,
  })
}

export function useCreateAdmin() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string; avatarUrl?: string }) =>
      api('/admins', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admins', slug] }),
  })
}

export function useUpdateAdmin(id: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: { name?: string; avatarUrl?: string; active?: boolean; timezone?: string; timeFormat?: '12h' | '24h' }) =>
      api(`/admins/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins', slug, id] })
      queryClient.invalidateQueries({ queryKey: ['admins', slug] })
    },
  })
}
