import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { Service } from '@/types'

export function useServices() {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Service[]>({
    queryKey: ['services', slug],
    queryFn: async () => (await api('/services')).json(),
  })
}

export function useService(id: string) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Service>({
    queryKey: ['service', slug, id],
    enabled: !!id,
    queryFn: async () => (await api(`/services/${id}`)).json(),
  })
}

export function useCreateService() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: { name: string; durationMinutes: number; description?: string; active?: boolean }) =>
      api('/services', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services', slug] }),
  })
}

export function useUpdateService(id: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: { name?: string; durationMinutes?: number; description?: string; active?: boolean }) =>
      api(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service', slug, id] })
      queryClient.invalidateQueries({ queryKey: ['services', slug] })
    },
  })
}

export function useDeleteService() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) => api(`/services/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services', slug] }),
  })
}

export function useForceDeleteService() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) => api(`/services/${id}?cancelFuture=true`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['services', slug] })
    },
  })
}
