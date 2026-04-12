import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { Professional } from '@/types'

export function useProfessionals() {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Professional[]>({
    queryKey: ['professionals', slug],
    queryFn: async () => (await api('/professionals')).json(),
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
    mutationFn: (body: {
      name: string; email: string; password: string;
      position?: string; bio?: string; avatarUrl?: string;
    }) => api('/professionals', { method: 'POST', body: JSON.stringify(body) }),
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
      position?: string; active?: boolean; role?: string;
    }) => api(`/professionals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional', slug, id] })
      queryClient.invalidateQueries({ queryKey: ['professionals', slug] })
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
