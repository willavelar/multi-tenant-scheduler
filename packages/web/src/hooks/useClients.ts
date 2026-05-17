import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { Client, ClientDetail, ClientPage } from '@/types'

type ClientFilters = { q?: string; active?: string; myClients?: boolean }

export function useClients(page = 1, filters: ClientFilters = {}) {
  const api = useApi()
  const { slug } = useTenant()
  const params = new URLSearchParams({ page: String(page), limit: '10' })
  if (filters.q)          params.set('q', filters.q)
  if (filters.active)     params.set('active', filters.active)
  if (filters.myClients)  params.set('myClients', 'true')
  return useQuery<ClientPage>({
    queryKey: ['clients', slug, page, filters],
    queryFn: async () => (await api(`/clients?${params}`)).json(),
  })
}

export function useClient(id: string) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<ClientDetail>({
    queryKey: ['client', slug, id],
    enabled: !!id,
    queryFn: async () => (await api(`/clients/${id}`)).json(),
  })
}

export function useSearchClients(q: string) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Client[]>({
    queryKey: ['clients', slug, 'search', q],
    queryFn: async () => (await api(`/auth/clients?q=${encodeURIComponent(q)}`)).json(),
    enabled: q.length >= 3,
  })
}

export function useCreateClient() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: {
      name: string; email: string; password?: string; sendInvite?: boolean;
      phone?: string; birthDate?: string; notes?: string;
      active?: boolean; avatarUrl?: string; allProfessionals?: boolean; allServices?: boolean;
      serviceLimitCount?: number; serviceLimitPeriod?: string;
      cancellationLimitCount?: number;
      cancellationLimitPeriod?: string;
      serviceLimits?: { serviceId: string; limitCount: number; limitPeriod: 'day' | 'week' | 'month' }[];
      professionalIds?: string[]; serviceIds?: string[];
    }) => api('/clients', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients', slug] }),
  })
}

export function useUpdateClient(id: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: {
      name?: string; email?: string; phone?: string;
      birthDate?: string; notes?: string; active?: boolean; avatarUrl?: string; allProfessionals?: boolean; allServices?: boolean;
      serviceLimitCount?: number | null; serviceLimitPeriod?: string | null;
      cancellationLimitCount?: number | null;
      cancellationLimitPeriod?: string | null;
      serviceLimits?: { serviceId: string; limitCount: number; limitPeriod: 'day' | 'week' | 'month' }[];
      professionalIds?: string[]; serviceIds?: string[];
    }) => api(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', slug, id] })
      queryClient.invalidateQueries({ queryKey: ['clients', slug] })
    },
  })
}

export function useDeleteClient() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) => api(`/clients/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients', slug] }),
  })
}

export function useForceDeleteClient() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) => api(`/clients/${id}?cancelFuture=true`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients', slug] }),
  })
}
