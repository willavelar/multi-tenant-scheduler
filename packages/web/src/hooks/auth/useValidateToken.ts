'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { useTenant } from '@/providers/TenantProvider'

type TokenValidationState =
  | { status: 'loading' }
  | { status: 'valid'; email: string }
  | { status: 'invalid' }

export function useValidateToken(token: string | null, endpoint: string): TokenValidationState {
  const { slug } = useTenant()
  const [state, setState] = useState<TokenValidationState>({ status: 'loading' })

  useEffect(() => {
    if (!token) {
      setState({ status: 'invalid' })
      return
    }

    apiFetch(endpoint + '?token=' + encodeURIComponent(token), { slug, method: 'GET' })
      .then((res) => res.json())
      .then((data: unknown) => {
        if (data && typeof data === 'object' && 'email' in data && typeof (data as Record<string, unknown>).email === 'string') {
          setState({ status: 'valid', email: (data as { email: string }).email })
        } else {
          setState({ status: 'invalid' })
        }
      })
      .catch(() => setState({ status: 'invalid' }))
  }, [token, endpoint, slug])

  return state
}
