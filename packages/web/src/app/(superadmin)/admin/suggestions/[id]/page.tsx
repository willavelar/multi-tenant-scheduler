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
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DateTimeCell } from '@/components/ui/DateTimeCell'
import { DetailSkeleton } from '@/components/ui/DetailSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'

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

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => router.push('/admin/suggestions')} className="text-sm text-muted-foreground hover:text-foreground">
        ← Voltar
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sugestão</h1>
        <StatusBadge
          label={data.status === 'resolved' ? 'Resolvida' : 'Nova'}
          variant={data.status === 'resolved' ? 'success' : 'purple'}
        />
      </div>

      <div className="bg-background border border-border rounded-xl p-5 space-y-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><div className="text-muted-foreground">Tenant</div><div className="font-medium">{data.tenantName ?? '—'}</div></div>
          <div><div className="text-muted-foreground">Data</div><div className="font-medium"><DateTimeCell iso={data.createdAt} /></div></div>
          <div><div className="text-muted-foreground">Usuário</div><div className="font-medium">{data.userName}</div></div>
          <div><div className="text-muted-foreground">Email</div><div className="font-medium">{data.userEmail}</div></div>
        </div>

        <div>
          <div className="text-muted-foreground text-sm mb-1">Conteúdo</div>
          <p className="whitespace-pre-wrap text-sm">{data.content}</p>
        </div>

        {data.imageUrl && (
          <div>
            <div className="text-muted-foreground text-sm mb-1">Anexo</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.imageUrl} alt="anexo" className="max-w-full rounded-lg border border-border" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {data.status !== 'resolved' && (
          <Button onClick={() => resolveMutation.mutate()} disabled={resolveMutation.isPending}>
            {resolveMutation.isPending ? 'Salvando…' : 'Marcar resolvida'}
          </Button>
        )}
        <Button
          variant="destructive-outline"
          onClick={() => { if (confirm('Excluir esta sugestão?')) deleteMutation.mutate() }}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
        </Button>
      </div>
    </div>
  )
}
