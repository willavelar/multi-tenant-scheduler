'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { useTenant } from '@/providers/TenantProvider'

type SSOData = { provider: string; name: string; email: string }

export function useOAuthPendingData(ssoCode: string | null): {
  ssoData: SSOData | null
  ssoError: boolean
} {
  const { slug } = useTenant()
  const [ssoData, setSsoData]   = useState<SSOData | null>(null)
  const [ssoError, setSsoError] = useState(false)

  useEffect(() => {
    if (!ssoCode) return

    apiFetch('/auth/oauth/pending?code=' + ssoCode, { slug, method: 'GET' })
      .then((res) => res.json())
      .then((data: unknown) => setSsoData(data as SSOData))
      .catch(() => setSsoError(true))
  }, [ssoCode, slug])

  return { ssoData, ssoError }
}
