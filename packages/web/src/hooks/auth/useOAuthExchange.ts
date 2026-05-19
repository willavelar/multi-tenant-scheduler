'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { useTenant } from '@/providers/TenantProvider'

export function useOAuthExchange(): void {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { slug } = useTenant()

  useEffect(() => {
    const code     = searchParams.get('code')
    const returnTo = searchParams.get('returnTo')
    const error    = searchParams.get('error')

    if (error || !code) {
      router.replace('/login?reason=oauth_error')
      return
    }

    apiFetch('/auth/oauth/exchange', { method: 'POST', slug, body: JSON.stringify({ code }) })
      .then((res) => res.json())
      .then((data: unknown) => {
        const { accessToken, refreshToken } = data as { accessToken: string; refreshToken: string }

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        document.cookie = `refreshToken=${refreshToken}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`
        window.dispatchEvent(new CustomEvent('token-refreshed', { detail: { accessToken } }))

        const destination = returnTo && returnTo.startsWith('/') ? returnTo : '/appointments'
        router.replace(destination)
      })
      .catch(() => router.replace('/login?reason=oauth_error'))
  }, [])
}
