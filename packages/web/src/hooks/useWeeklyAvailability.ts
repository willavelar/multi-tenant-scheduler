import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { WeeklyAvailability, ScheduleException } from '@/types'

export function useWeeklyAvailability(professionalId: string | null) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<WeeklyAvailability[]>({
    queryKey: ['weekly-availability', slug, professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const res = await api(`/availability/weekly/${professionalId}`)
      return res.json()
    },
  })
}

export function useCreateWeeklyAvailability() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: async (data: {
      professionalId: string
      dayOfWeek: number
      startTime: string
      endTime: string
      slotDurationMinutes: number
    }) => {
      const res = await api('/availability/weekly', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['weekly-availability', slug, variables.professionalId] })
    },
  })
}

export function useDeleteWeeklyAvailability() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) => api(`/availability/weekly/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weekly-availability', slug] }),
  })
}

export function useExceptions(professionalId: string | null) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<ScheduleException[]>({
    queryKey: ['exceptions', slug, professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const res = await api(`/availability/exceptions/${professionalId}`)
      return res.json()
    },
  })
}

export function useCreateException() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: async (data: {
      professionalId: string
      date: string
      type: 'block' | 'extra'
      startTime: string
      endTime: string
      reason?: string
    }) => {
      const res = await api('/availability/exceptions', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exceptions', slug, variables.professionalId] })
    },
  })
}

export function useDeleteException() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) => api(`/availability/exceptions/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exceptions', slug] }),
  })
}
