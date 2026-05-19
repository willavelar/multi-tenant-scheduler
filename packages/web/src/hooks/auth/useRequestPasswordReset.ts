'use client'

import { useMutation, UseMutationResult } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useTenant } from '@/providers/TenantProvider'

export function useRequestPasswordReset(): UseMutationResult<Response, Error, string> {
  const { slug } = useTenant()

  return useMutation({
    mutationFn: (email: string) =>
      apiFetch('/auth/forgot-password', { slug, method: 'POST', body: JSON.stringify({ email }) }),
  })
}
