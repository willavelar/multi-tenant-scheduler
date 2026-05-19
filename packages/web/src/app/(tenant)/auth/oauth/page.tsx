'use client'

import { Suspense } from 'react'
import { useOAuthExchange } from '@/hooks/auth/useOAuthExchange'

function OAuthCallbackContent() {
  useOAuthExchange()

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
