'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { superAdminFetch, SuperAdminApiError } from '@/lib/super-admin-api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FormCard } from '@/components/sections/FormCard'
import { FormField } from '@/components/fields/FormField'
import { inputCls } from '@/components/fields/inputStyles'
import { Alert } from '@/components/feedback/Alert'
import { FormSkeleton } from '@/components/loading/FormSkeleton'

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

const saveIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)

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

function ProviderCard({ provider }: { provider: SsoProvider }) {
  const queryClient = useQueryClient()
  const [clientId, setClientId] = useState(provider.clientId ?? '')
  const [clientSecret, setClientSecret] = useState('')
  const [feedback, setFeedback] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  // Sync clientId input when the provider data refreshes after a save
  useEffect(() => {
    setClientId(provider.clientId ?? '')
  }, [provider.clientId])

  function notify(message: string, variant: 'success' | 'error') {
    setFeedback({ message, variant })
    setTimeout(() => setFeedback(null), 3000)
  }

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
      notify(provider.enabled ? 'Provedor desativado' : 'Provedor ativado', 'success')
    } catch (err) {
      notify(err instanceof SuperAdminApiError ? err.message : 'Erro ao atualizar', 'error')
    }
  }

  async function handleSave() {
    const body: Record<string, unknown> = { enabled: provider.enabled, clientId }
    if (clientSecret.trim()) body.clientSecret = clientSecret
    try {
      await upsert.mutateAsync(body)
      setClientSecret('')
      notify('Configurações salvas', 'success')
    } catch (err) {
      notify(err instanceof SuperAdminApiError ? err.message : 'Erro ao salvar', 'error')
    }
  }

  const isEditable = provider.enabled
  const fieldCls = cn(inputCls(), 'disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed')

  return (
    <FormCard title={PROVIDER_LABELS[provider.provider]}>
      {/* Brand + status on the left, enable toggle on the right */}
      <div className="flex items-center justify-between -mt-1 mb-5">
        <div className="flex items-center gap-2">
          <ProviderIcon provider={provider.provider} />
          <span className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', provider.enabled ? 'bg-green-500' : 'bg-muted-foreground/40')} />
            <span className="text-xs text-muted-foreground">{provider.enabled ? 'Ativo' : 'Inativo'}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={upsert.isPending}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-65',
            provider.enabled ? 'bg-indigo-600' : 'bg-muted-foreground/30',
          )}
          aria-label={`${provider.enabled ? 'Desativar' : 'Ativar'} ${PROVIDER_LABELS[provider.provider]}`}
        >
          <span className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            provider.enabled ? 'translate-x-6' : 'translate-x-1',
          )} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Client ID">
          <input
            type="text"
            className={fieldCls}
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            disabled={!isEditable}
            placeholder={isEditable ? '' : 'Ative para editar'}
          />
        </FormField>
        <FormField label={`Client Secret${provider.secretSet ? ' (salvo)' : ''}`}>
          <input
            type="password"
            className={fieldCls}
            value={clientSecret}
            onChange={e => setClientSecret(e.target.value)}
            disabled={!isEditable}
            placeholder={provider.secretSet ? 'Deixe em branco para manter' : isEditable ? '' : 'Ative para editar'}
          />
        </FormField>
      </div>

      {feedback && (
        <div className="mt-4">
          <Alert variant={feedback.variant} size="sm">{feedback.message}</Alert>
        </div>
      )}

      <Button
        type="button"
        variant="primary"
        size="lg"
        icon={saveIcon}
        loading={upsert.isPending}
        disabled={!isEditable}
        onClick={handleSave}
        className="w-full mt-4"
      >
        Salvar
      </Button>
    </FormCard>
  )
}

export default function SsoSettingsPage() {
  const { data: providers, isLoading, isError } = useQuery<SsoProvider[]>({
    queryKey: ['sso-providers'],
    queryFn: async () => {
      const res = await superAdminFetch('/super-admin/sso')
      return res.json()
    },
  })

  if (isLoading) return <FormSkeleton fields={3} />
  if (isError)   return <Alert variant="error" size="sm">Erro ao carregar configurações de SSO.</Alert>

  return (
    <div>
      {providers?.map(p => (
        <ProviderCard key={p.provider} provider={p} />
      ))}
    </div>
  )
}
