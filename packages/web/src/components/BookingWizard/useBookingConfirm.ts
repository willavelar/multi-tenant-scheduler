'use client'

import { useState } from 'react'
import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query'
import { useTenant } from '@/providers/TenantProvider'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'

type Params = {
  professionalId: string
  serviceId: string
  date: string
  startTime: string
}

type BookingResult = { status: string }

type UseBookingConfirmReturn = {
  bookMutation: UseMutationResult<BookingResult, Error, void>
  bookWithToken: (freshToken: string) => Promise<void>
  result: BookingResult | null
  bookError: string | null
}

export function useBookingConfirm({ professionalId, serviceId, date, startTime }: Params): UseBookingConfirmReturn {
  const api = useApi()
  const { slug } = useTenant()
  const queryClient = useQueryClient()
  const [result, setResult] = useState<BookingResult | null>(null)
  const [bookError, setBookError] = useState<string | null>(null)

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await api('/appointments', {
        method: 'POST',
        body: JSON.stringify({ professionalId, serviceId, date, startTime }),
      })
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setResult(data)
    },
  })

  async function bookWithToken(freshToken: string) {
    try {
      const res = await apiFetch('/appointments', {
        method: 'POST',
        slug,
        token: freshToken,
        body: JSON.stringify({ professionalId, serviceId, date, startTime }),
      })
      const data = await res.json()
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setResult(data)
    } catch (err) {
      setBookError(err instanceof Error ? err.message : 'Erro ao agendar')
    }
  }

  return { bookMutation, bookWithToken, result, bookError }
}
