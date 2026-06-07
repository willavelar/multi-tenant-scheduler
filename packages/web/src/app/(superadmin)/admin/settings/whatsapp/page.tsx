'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { superAdminFetch, SuperAdminApiError } from '@/lib/super-admin-api'
import { cn } from '@/lib/utils'
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

export default function WhatsAppSettingsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: async () => (await superAdminFetch('/super-admin/integrations')).json(),
  })
  const wa = data?.find(i => i.key === 'whatsapp')

  const [accountSid, setAccountSid] = useState('')
  const [whatsappFrom, setWhatsappFrom] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [feedback, setFeedback] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  useEffect(() => {
    setAccountSid(wa?.config.accountSid ?? '')
    setWhatsappFrom(wa?.config.whatsappFrom ?? '')
  }, [wa?.config.accountSid, wa?.config.whatsappFrom])

  function notify(message: string, variant: 'success' | 'error') {
    setFeedback({ message, variant })
    setTimeout(() => setFeedback(null), 3000)
  }

  const upsert = useMutation({
    mutationFn: async (body: object) => {
      await superAdminFetch('/super-admin/integrations/whatsapp', { method: 'PUT', body: JSON.stringify(body) })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })

  async function handleToggle() {
    if (!wa) return
    try {
      await upsert.mutateAsync({ enabled: !wa.enabled, accountSid, whatsappFrom })
      notify(wa.enabled ? 'Integração desativada' : 'Integração ativada', 'success')
    } catch (err) {
      notify(err instanceof SuperAdminApiError ? err.message : 'Erro ao atualizar', 'error')
    }
  }

  async function handleSave() {
    if (!wa) return
    const body: Record<string, unknown> = { enabled: wa.enabled, accountSid, whatsappFrom }
    if (authToken.trim()) body.authToken = authToken
    try {
      await upsert.mutateAsync(body)
      setAuthToken('')
      notify('Configurações salvas', 'success')
    } catch (err) {
      notify(err instanceof SuperAdminApiError ? err.message : 'Erro ao salvar', 'error')
    }
  }

  if (isLoading) return <FormSkeleton fields={3} />
  if (isError || !wa) return <Alert variant="error" size="sm">Erro ao carregar configurações do WhatsApp.</Alert>

  const isEditable = wa.enabled
  const fieldCls = cn(inputCls(), 'disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed')

  return (
    <IntegrationCard
      title="WhatsApp"
      enabled={wa.enabled}
      onToggle={handleToggle}
      onSave={handleSave}
      saving={upsert.isPending}
      feedback={feedback}
    >
      <FormField label="Account SID">
        <input type="text" className={fieldCls} value={accountSid}
          onChange={e => setAccountSid(e.target.value)} disabled={!isEditable}
          placeholder={isEditable ? '' : 'Ative para editar'} />
      </FormField>
      <FormField label={`Auth Token${wa.secretSet ? ' (salvo)' : ''}`}>
        <input type="password" className={fieldCls} value={authToken}
          onChange={e => setAuthToken(e.target.value)} disabled={!isEditable}
          placeholder={wa.secretSet ? 'Deixe em branco para manter' : isEditable ? '' : 'Ative para editar'} />
      </FormField>
      <FormField label="WhatsApp From">
        <input type="text" className={fieldCls} value={whatsappFrom}
          onChange={e => setWhatsappFrom(e.target.value)} disabled={!isEditable}
          placeholder={isEditable ? 'whatsapp:+5511999999999' : 'Ative para editar'} />
      </FormField>
    </IntegrationCard>
  )
}
