'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { superAdminFetch, SuperAdminApiError } from '@/lib/super-admin-api'
import { FormField } from '@/components/fields/FormField'
import { inputCls } from '@/components/fields/inputStyles'
import { Alert } from '@/components/feedback/Alert'
import { FormSkeleton } from '@/components/loading/FormSkeleton'
import { IntegrationCard } from '../_components/IntegrationCard'

interface Integration {
  key: 'whatsapp' | 'email'
  enabled: boolean
  config: Record<string, string>
  secretSet: boolean
}

export default function EmailSettingsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: async () => (await superAdminFetch('/super-admin/integrations')).json(),
  })
  const email = data?.find(i => i.key === 'email')

  const [fromEmail, setFromEmail] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [feedback, setFeedback] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  useEffect(() => {
    setFromEmail(email?.config.fromEmail ?? '')
  }, [email?.config.fromEmail])

  function notify(message: string, variant: 'success' | 'error') {
    setFeedback({ message, variant })
    setTimeout(() => setFeedback(null), 3000)
  }

  const upsert = useMutation({
    mutationFn: async (body: object) => {
      await superAdminFetch('/super-admin/integrations/email', { method: 'PUT', body: JSON.stringify(body) })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })

  async function handleToggle() {
    if (!email) return
    const body: Record<string, unknown> = { enabled: !email.enabled, fromEmail }
    if (apiKey.trim()) body.apiKey = apiKey
    try {
      await upsert.mutateAsync(body)
      if (apiKey.trim()) setApiKey('')
      notify(email.enabled ? 'Integração desativada' : 'Integração ativada', 'success')
    } catch (err) {
      notify(err instanceof SuperAdminApiError ? err.message : 'Erro ao atualizar', 'error')
    }
  }

  async function handleSave() {
    if (!email) return
    const body: Record<string, unknown> = { enabled: email.enabled, fromEmail }
    if (apiKey.trim()) body.apiKey = apiKey
    try {
      await upsert.mutateAsync(body)
      setApiKey('')
      notify('Configurações salvas', 'success')
    } catch (err) {
      notify(err instanceof SuperAdminApiError ? err.message : 'Erro ao salvar', 'error')
    }
  }

  if (isLoading) return <FormSkeleton fields={2} />
  if (isError || !email) return <Alert variant="error" size="sm">Erro ao carregar configurações de e-mail.</Alert>

  return (
    <IntegrationCard
      title="E-mail"
      enabled={email.enabled}
      onToggle={handleToggle}
      onSave={handleSave}
      saving={upsert.isPending}
      feedback={feedback}
    >
      <FormField label={`Resend API Key${email.secretSet ? ' (salvo)' : ''}`}>
        <input type="password" className={inputCls()} value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder={email.secretSet ? 'Deixe em branco para manter' : ''} />
      </FormField>
      <FormField label="From Email">
        <input type="text" className={inputCls()} value={fromEmail}
          onChange={e => setFromEmail(e.target.value)}
          placeholder="noreply@suaempresa.com" />
      </FormField>
    </IntegrationCard>
  )
}
