'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/useApi'

type Provider = 'google' | 'microsoft' | 'facebook'

export function useOAuthLinkIntent(): {
  linking: Provider | null
  linkProvider: (provider: Provider) => Promise<void>
} {
  const api = useApi()
  const [linking, setLinking] = useState<Provider | null>(null)

  async function linkProvider(provider: Provider): Promise<void> {
    setLinking(provider)
    try {
      const res = await api('/auth/oauth/link/intent', {
        method: 'POST',
        body:   JSON.stringify({ provider, returnTo: window.location.pathname }),
      })
      const { authUrl } = await res.json() as { authUrl: string }
      window.location.href = authUrl
    } catch {
      setLinking(null)
    }
  }

  return { linking, linkProvider }
}
