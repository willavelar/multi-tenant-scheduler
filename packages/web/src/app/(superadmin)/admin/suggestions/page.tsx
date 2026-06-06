'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { listSuggestions, type SuggestionStatus } from '@/lib/super-admin-api'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DateTimeCell } from '@/components/ui/DateTimeCell'

const COLS = ['Tenant', 'Usuário', 'Conteúdo', 'Data', 'Status']

export default function SuggestionsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<SuggestionStatus | ''>('')
  const limit = 20

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sa-suggestions', page, status],
    queryFn: () => listSuggestions(page, limit, status || undefined),
  })

  const items = data?.data ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sugestões</h1>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as SuggestionStatus | ''); setPage(1) }}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Todas</option>
          <option value="new">Novas</option>
          <option value="resolved">Resolvidas</option>
        </select>
      </div>

      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : isError ? (
          <EmptyState title="Erro ao carregar" description="Não foi possível carregar as sugestões." />
        ) : !items.length ? (
          <EmptyState title="Nenhuma sugestão" description="Ainda não há sugestões enviadas." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {COLS.map((c) => <th key={c} className="px-4 py-3 font-medium">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/admin/suggestions/${s.id}`)}
                  className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                >
                  <td className="px-4 py-3">{s.tenantName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.userName}</div>
                    <div className="text-xs text-muted-foreground">{s.userEmail}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{s.content}</td>
                  <td className="px-4 py-3"><DateTimeCell iso={s.createdAt} /></td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={s.status === 'resolved' ? 'Resolvida' : 'Nova'}
                      variant={s.status === 'resolved' ? 'success' : 'purple'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded border border-border disabled:opacity-40">Anterior</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded border border-border disabled:opacity-40">Próxima</button>
        </div>
      )}
    </div>
  )
}
