'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTenant } from '@/providers/TenantProvider'
import { apiFetch } from '@/lib/api'

function OAuthCallbackContent() {
  const searchParams = useSearchParams()
  const { slug }     = useTenant()
  const router       = useRouter()

  useEffect(() => {
    const code     = searchParams.get('code')
    const returnTo = searchParams.get('returnTo') ?? '/appointments'
    const error    = searchParams.get('error')

    if (error || !code) {
      router.replace('/login?reason=oauth_error')
      return
    }

    apiFetch('/auth/oauth/exchange', {
      method: 'POST',
      slug,
      body:   JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then(({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        document.cookie = `refreshToken=${refreshToken}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`
        window.dispatchEvent(new CustomEvent('token-refreshed', { detail: { accessToken } }))
        router.replace(returnTo.startsWith('/') ? returnTo : '/appointments')
      })
      .catch(() => router.replace('/login?reason=oauth_error'))
  }, [searchParams, slug, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Autenticando...</p>
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense>
      <OAuthCallbackContent />
    </Suspense>
  )
}
