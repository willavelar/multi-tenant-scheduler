'use client'

import { use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  getSuggestion,
  updateSuggestionStatus,
  deleteSuggestion,
} from '@/lib/super-admin-api'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/feedback/StatusBadge'
import { DetailHeader } from '@/components/sections/DetailHeader'
import { DetailIdentity } from '@/components/sections/DetailIdentity'
import { DetailCard } from '@/components/sections/DetailCard'
import { FieldRow } from '@/components/data-display/FieldRow'
import { DetailSkeleton } from '@/components/loading/DetailSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'

export default function SuggestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sa-suggestion', id],
    queryFn: () => getSuggestion(id),
  })

  const resolveMutation = useMutation({
    mutationFn: () => updateSuggestionStatus(id, 'resolved'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-suggestion', id] })
      queryClient.invalidateQueries({ queryKey: ['sa-suggestions'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSuggestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-suggestions'] })
      router.push('/admin/suggestions')
    },
  })

  if (isLoading) return <DetailSkeleton />
  if (isError || !data) return <EmptyState title="Não encontrada" description="Esta sugestão não existe mais." />

  const isResolved = data.status === 'resolved'

  return (
    <div>
      <DetailHeader backHref="/admin/suggestions" backLabel="Voltar para sugestões">
        {!isResolved && (
          <Button
            variant="secondary"
            size="md"
            onClick={() => resolveMutation.mutate()}
            disabled={resolveMutation.isPending}
          >
            {resolveMutation.isPending ? 'Salvando…' : 'Marcar resolvida'}
          </Button>
        )}
        <Button
          variant="destructive-outline"
          size="md"
          onClick={() => { if (confirm('Excluir esta sugestão?')) deleteMutation.mutate() }}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
        </Button>
      </DetailHeader>

      <DetailIdentity name={data.userName} subtitle={data.userEmail} id={data.id} />

      <DetailCard>
        <FieldRow label="Tenant" value={data.tenantName ?? '—'} />
        <FieldRow label="Usuário" value={data.userName} />
        <FieldRow label="Status" value={
          <StatusBadge
            label={isResolved ? 'Resolvida' : 'Nova'}
            variant={isResolved ? 'success' : 'purple'}
          />
        } />
        <FieldRow label="Criado em" value={new Date(data.createdAt).toLocaleDateString('pt-BR')} />
        <FieldRow label="Conteúdo" value={<span className="whitespace-pre-wrap">{data.content}</span>} />
        {data.imageUrl && (
          <FieldRow label="Anexo" value={
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.imageUrl} alt="anexo" className="max-w-full rounded-lg border border-border" />
          } />
        )}
      </DetailCard>
    </div>
  )
}
