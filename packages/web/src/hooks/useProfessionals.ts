import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { Professional, ProfessionalPage } from '@/types'

export function useProfessionals() {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Professional[]>({
    queryKey: ['professionals', slug],
    queryFn: async () => {
      const r: ProfessionalPage = await (await api('/professionals?limit=100')).json()
      return r.data
    },
  })
}

type ProfessionalFilters = { q?: string; active?: string }

export function useProfessionalsPage(page = 1, filters: ProfessionalFilters = {}) {
  const api = useApi()
  const { slug } = useTenant()
  const params = new URLSearchParams({ page: String(page), limit: '10' })
  if (filters.q)      params.set('q', filters.q)
  if (filters.active) params.set('active', filters.active)
  return useQuery<ProfessionalPage>({
    queryKey: ['professionals-page', slug, page, filters],
    queryFn: async () => (await api(`/professionals?${params}`)).json(),
  })
}

export function useProfessional(id: string) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Professional>({
    queryKey: ['professional', slug, id],
    enabled: !!id,
    queryFn: async () => (await api(`/professionals/${id}`)).json(),
  })
}

export function useMyProfessionalProfile() {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Professional>({
    queryKey: ['professional-me', slug],
    queryFn: async () => (await api('/professionals/me')).json(),
  })
}

export function useCreateProfessional() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: async (body: {
      name: string; email: string; password?: string; sendInvite?: boolean;
      position?: string; bio?: string; avatarUrl?: string; timezone?: string; timeFormat?: '12h' | '24h';
      schedule?: { dayOfWeek: number; startTime: string; endTime: string }[];
    }) => {
      const res = await api('/professionals', { method: 'POST', body: JSON.stringify(body) })
      return res.json() as Promise<{ id: string }>
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals', slug] }),
  })
}

export function useUpdateProfessional(id: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: {
      name?: string; bio?: string; avatarUrl?: string;
      position?: string; timezone?: string; timeFormat?: '12h' | '24h'; active?: boolean; role?: string;
    }) => api(`/professionals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional', slug, id] })
      queryClient.invalidateQueries({ queryKey: ['professionals', slug] })
      queryClient.invalidateQueries({ queryKey: ['professionals-page', slug] })
      queryClient.invalidateQueries({ queryKey: ['professional-me', slug] })
    },
  })
}

export function useDeleteProfessional() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) => api(`/professionals/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals', slug] }),
  })
}

export function useForceDeleteProfessional() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) => api(`/professionals/${id}?cancelFuture=true`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals', slug] })
      queryClient.invalidateQueries({ queryKey: ['professionals-page', slug] })
    },
  })
}
