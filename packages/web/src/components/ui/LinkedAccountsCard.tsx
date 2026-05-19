'use client'

import { useState } from 'react'
import { useOAuthAccounts, useUnlinkOAuth } from '@/hooks/auth/useOAuthAccounts'
import { useTenant } from '@/providers/TenantProvider'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Provider = 'google' | 'microsoft' | 'facebook'

const PROVIDERS: { id: Provider; label: string; icon: React.ReactNode }[] = [
  {
    id: 'google',
    label: 'Google',
    icon: (
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
    ),
  },
  {
    id: 'microsoft',
    label: 'Microsoft',
    icon: (
      <svg width="18" height="18" viewBox="0 0 23 23">
        <path fill="#f25022" d="M0 0h11v11H0z"/>
        <path fill="#00a4ef" d="M12 0h11v11H12z"/>
        <path fill="#7fba00" d="M0 12h11v11H0z"/>
        <path fill="#ffb900" d="M12 12h11v11H12z"/>
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877f2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
]

export function LinkedAccountsCard() {
  const { slug }                           = useTenant()
  const { accessToken }                    = useAuth()
  const { data: accounts = [], isLoading } = useOAuthAccounts()
  const unlink                             = useUnlinkOAuth()
  const [linking, setLinking]              = useState<Provider | null>(null)

  const linkedProviders = new Set(accounts.map((a) => a.provider))

  async function handleLink(provider: Provider) {
    setLinking(provider)
    try {
      const res = await fetch(`${API_URL}/auth/oauth/link/intent`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${accessToken}`,
          'x-tenant-slug': slug,
        },
        body: JSON.stringify({ provider, returnTo: window.location.pathname }),
      })
      if (!res.ok) throw new Error()
      const { authUrl } = await res.json() as { authUrl: string }
      window.location.href = authUrl
    } catch {
      setLinking(null)
    }
  }

  return (
    <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm">
      <p className="text-sm font-bold text-foreground m-0 mb-5">Contas vinculadas</p>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 h-10">
              <div className="w-[18px] h-[18px] rounded bg-muted animate-pulse" />
              <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {PROVIDERS.map(({ id, label, icon }) => {
            const linked  = linkedProviders.has(id)
            const account = accounts.find((a) => a.provider === id)

            return (
              <div key={id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground m-0">{label}</p>
                  {linked && account?.providerEmail ? (
                    <p className="text-xs text-muted-foreground m-0 truncate">{account.providerEmail}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground m-0">Não vinculado</p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {linked ? (
                    <>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300">
                        Vinculado
                      </span>
                      <button
                        type="button"
                        disabled={unlink.isPending}
                        onClick={() => unlink.mutate(id)}
                        className={cn(
                          'text-xs font-semibold text-red-500 border border-red-200 rounded-md px-2.5 py-1',
                          'hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                          'dark:border-red-800 dark:hover:bg-red-900/20',
                        )}
                      >
                        Remover
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={linking === id}
                      onClick={() => handleLink(id)}
                      className={cn(
                        'text-xs font-semibold text-blue-600 border border-blue-200 rounded-md px-2.5 py-1',
                        'hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                        'dark:border-blue-800 dark:hover:bg-blue-900/20',
                      )}
                    >
                      {linking === id ? 'Aguarde...' : 'Vincular'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
