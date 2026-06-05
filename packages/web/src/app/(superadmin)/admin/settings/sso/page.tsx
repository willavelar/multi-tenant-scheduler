'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { superAdminFetch, SuperAdminApiError } from '@/lib/super-admin-api'

type SsoProviderName = 'google' | 'microsoft' | 'facebook'

interface SsoProvider {
  provider: SsoProviderName
  enabled: boolean
  clientId: string | null
  secretSet: boolean
}

const PROVIDER_LABELS: Record<SsoProviderName, string> = {
  google:    'Google',
  microsoft: 'Microsoft',
  facebook:  'Facebook',
}

function ProviderIcon({ provider }: { provider: SsoProviderName }) {
  if (provider === 'google') return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
  if (provider === 'microsoft') return (
    <svg width="20" height="20" viewBox="0 0 23 23">
      <path fill="#f25022" d="M0 0h11v11H0z"/>
      <path fill="#00a4ef" d="M12 0h11v11H12z"/>
      <path fill="#7fba00" d="M0 12h11v11H0z"/>
      <path fill="#ffb900" d="M12 12h11v11H12z"/>
    </svg>
  )
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877f2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function Toast({ message, variant }: { message: string; variant: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
      variant === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {message}
    </div>
  )
}

function ProviderCard({
  provider,
  onSaved,
}: {
  provider: SsoProvider
  onSaved: (message: string, variant: 'success' | 'error') => void
}) {
  const queryClient = useQueryClient()
  const [clientId, setClientId] = useState(provider.clientId ?? '')
  const [clientSecret, setClientSecret] = useState('')

  // Sync clientId input when the provider data refreshes after a save
  useEffect(() => {
    setClientId(provider.clientId ?? '')
  }, [provider.clientId])

  const upsert = useMutation({
    mutationFn: async (body: object) => {
      await superAdminFetch(`/super-admin/sso/${provider.provider}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sso-providers'] }),
  })

  async function handleToggle() {
    try {
      await upsert.mutateAsync({ enabled: !provider.enabled })
      onSaved(
        provider.enabled ? 'Provedor desativado' : 'Provedor ativado',
        'success',
      )
    } catch (err) {
      onSaved(err instanceof SuperAdminApiError ? err.message : 'Erro ao atualizar', 'error')
    }
  }

  async function handleSave() {
    const body: Record<string, unknown> = { enabled: provider.enabled, clientId }
    if (clientSecret.trim()) body.clientSecret = clientSecret
    try {
      await upsert.mutateAsync(body)
      setClientSecret('')
      onSaved('Configurações salvas', 'success')
    } catch (err) {
      onSaved(err instanceof SuperAdminApiError ? err.message : 'Erro ao salvar', 'error')
    }
  }

  const isEditable = provider.enabled
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${
    isEditable
      ? 'border-border bg-background text-foreground'
      : 'border-border bg-muted text-muted-foreground cursor-not-allowed'
  }`

  return (
    <div className="bg-background border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ProviderIcon provider={provider.provider} />
          <div>
            <p className="font-semibold text-[15px]">{PROVIDER_LABELS[provider.provider]}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${provider.enabled ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
              <span className="text-xs text-muted-foreground">{provider.enabled ? 'Ativo' : 'Inativo'}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={upsert.isPending}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            provider.enabled ? 'bg-indigo-600' : 'bg-muted-foreground/30'
          }`}
          aria-label={`${provider.enabled ? 'Desativar' : 'Ativar'} ${PROVIDER_LABELS[provider.provider]}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            provider.enabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Client ID</label>
          <input
            type="text"
            className={inputCls}
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            disabled={!isEditable}
            placeholder={isEditable ? '' : 'Ative para editar'}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Client Secret
            {provider.secretSet && <span className="ml-1 text-muted-foreground/60">(salvo)</span>}
          </label>
          <input
            type="password"
            className={inputCls}
            value={clientSecret}
            onChange={e => setClientSecret(e.target.value)}
            disabled={!isEditable}
            placeholder={provider.secretSet ? 'Deixe em branco para manter' : isEditable ? '' : 'Ative para editar'}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!isEditable || upsert.isPending}
        className="w-full py-2 rounded-lg text-sm font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Salvar
      </button>
    </div>
  )
}

export default function SsoSettingsPage() {
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  const { data: providers, isLoading, isError } = useQuery<SsoProvider[]>({
    queryKey: ['sso-providers'],
    queryFn: async () => {
      const res = await superAdminFetch('/super-admin/sso')
      return res.json()
    },
  })

  function showToast(message: string, variant: 'success' | 'error') {
    setToast({ message, variant })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Configurações de SSO</h1>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-background border border-border rounded-xl p-5 h-56 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600">Erro ao carregar configurações de SSO.</p>
      )}

      {providers && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providers.map(p => (
            <ProviderCard key={p.provider} provider={p} onSaved={showToast} />
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} variant={toast.variant} />}
    </div>
  )
}
