import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { Appointment, AppointmentPage } from '@/types'

type AppointmentFilters = {
  dateFrom?: string
  dateTo?: string
  serviceId?: string
  status?: string
  clientId?: string
  professionalId?: string
}

export function useAppointments(page = 1, filters: AppointmentFilters = {}) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<AppointmentPage>({
    queryKey: ['appointments', slug, page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '10' })
      if (filters.dateFrom)  params.set('dateFrom',  filters.dateFrom)
      if (filters.dateTo)    params.set('dateTo',    filters.dateTo)
      if (filters.serviceId) params.set('serviceId', filters.serviceId)
      if (filters.status)    params.set('status',    filters.status)
      if (filters.clientId)       params.set('clientId',       filters.clientId)
      if (filters.professionalId) params.set('professionalId', filters.professionalId)
      const res = await api(`/appointments?${params}`)
      return res.json()
    },
  })
}

export function useCreateAppointment() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: {
      professionalId: string
      serviceId: string
      date: string
      startTime: string
      clientId?: string
      initialStatus?: 'pending' | 'confirmed'
    }) =>
      api('/appointments', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments', slug] }),
  })
}

export function useConfirmAppointment() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) =>
      api(`/appointments/${id}/confirm`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', slug] })
      queryClient.invalidateQueries({ queryKey: ['appointments-calendar', slug] })
    },
  })
}

export function useCancelAppointment() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) =>
      api(`/appointments/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', slug] })
      queryClient.invalidateQueries({ queryKey: ['appointments-calendar', slug] })
    },
  })
}

export function useCompleteAppointment() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) =>
      api(`/appointments/${id}/complete`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', slug] })
      queryClient.invalidateQueries({ queryKey: ['appointments-calendar', slug] })
    },
  })
}

type CalendarFilters = {
  serviceId?: string
  status?: string
  clientId?: string
  professionalId?: string
}

export function useAppointmentsCalendar(
  dateFrom: string,
  dateTo: string,
  filters: CalendarFilters = {},
) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Appointment[]>({
    queryKey: ['appointments-calendar', slug, dateFrom, dateTo, filters.serviceId, filters.status, filters.clientId, filters.professionalId],
    queryFn: async () => {
      const params = new URLSearchParams({ dateFrom, dateTo, limit: '500' })
      if (filters.serviceId)      params.set('serviceId',      filters.serviceId)
      if (filters.status)         params.set('status',         filters.status)
      if (filters.clientId)       params.set('clientId',       filters.clientId)
      if (filters.professionalId) params.set('professionalId', filters.professionalId)
      const res = await api(`/appointments?${params}`)
      const page = await res.json()
      return page.data as Appointment[]
    },
    enabled: !!dateFrom && !!dateTo,
  })
}

export function useDeleteAppointment() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) =>
      api(`/appointments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', slug] })
      queryClient.invalidateQueries({ queryKey: ['appointments-calendar', slug] })
    },
  })
}
