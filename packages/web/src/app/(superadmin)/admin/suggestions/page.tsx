'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { listSuggestions, type SuggestionStatus } from '@/lib/super-admin-api'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/feedback/EmptyState'
import { StatusBadge } from '@/components/feedback/StatusBadge'
import { DateTimeCell } from '@/components/data-display/DateTimeCell'

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
          <Table>
            <TableHeader>
              <TableRow>
                {COLS.map((c) => <TableHead key={c}>{c}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow
                  key={s.id}
                  onClick={() => router.push(`/admin/suggestions/${s.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell>{s.tenantName ?? '—'}</TableCell>
                  <TableCell>
                    <div className="font-medium">{s.userName}</div>
                    <div className="text-xs text-muted-foreground">{s.userEmail}</div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{s.content}</TableCell>
                  <TableCell><DateTimeCell iso={s.createdAt} /></TableCell>
                  <TableCell>
                    <StatusBadge
                      label={s.status === 'resolved' ? 'Resolvida' : 'Nova'}
                      variant={s.status === 'resolved' ? 'success' : 'purple'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
