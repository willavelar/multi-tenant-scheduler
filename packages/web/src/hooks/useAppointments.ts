import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { Appointment } from '@/types'

export function useAppointments() {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Appointment[]>({
    queryKey: ['appointments', slug],
    queryFn: async () => {
      const res = await api('/appointments')
      return res.json()
    },
  })
}

export function useConfirmAppointment() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) =>
      api(`/appointments/${id}/confirm`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments', slug] }),
  })
}

export function useCancelAppointment() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) =>
      api(`/appointments/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments', slug] }),
  })
}
