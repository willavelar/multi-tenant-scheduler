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
import { ViewButton } from '@/components/navigation/ViewButton'
import { TablePagination } from '@/components/navigation/TablePagination'
import { FilterBar } from '@/components/filters/FilterBar'
import { SelectField } from '@/components/filters/SelectField'

const COLS = ['Tenant', 'Usuário', 'Conteúdo', 'Data', 'Status', 'Ações']

export default function SuggestionsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<SuggestionStatus | ''>('')
  const limit = 20

  const hasFilters = !!status

  const onStatus = (v: string) => { setStatus(v as SuggestionStatus | ''); setPage(1) }
  const onClear  = () => { setStatus(''); setPage(1) }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sa-suggestions', page, status],
    queryFn: () => listSuggestions(page, limit, status || undefined),
  })

  const items      = data?.data ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1

  return (
    <div className="w-full">

      {/* Filters */}
      <FilterBar showClear={hasFilters} onClear={onClear}>
        <SelectField
          label="Status"
          value={status}
          onChange={onStatus}
          options={[
            { value: '', label: 'Todas' },
            { value: 'new', label: 'Novas' },
            { value: 'resolved', label: 'Resolvidas' },
          ]}
        />
      </FilterBar>

      {/* Table card */}
      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : isError ? (
          <EmptyState title="Erro ao carregar" description="Não foi possível carregar as sugestões." />
        ) : !items.length ? (
          <EmptyState
            title="Nenhuma sugestão"
            description={hasFilters ? 'Nenhuma sugestão encontrada para os filtros aplicados.' : 'Sugestões aparecerão aqui após serem enviadas.'}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {COLS.map((col, i) => (
                    <TableHead key={i}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.tenantName ?? '—'}</TableCell>
                    <TableCell>
                      <div className="font-medium">{s.userName}</div>
                      <div className="text-xs text-muted-foreground">{s.userEmail}</div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{s.content}</TableCell>
                    <TableCell><DateTimeCell iso={s.createdAt} /></TableCell>
                    <TableCell>
                      <StatusBadge
                        label={s.status === 'resolved' ? 'Resolvida' : 'Nova'}
                        variant={s.status === 'resolved' ? 'success' : 'purple'}
                      />
                    </TableCell>
                    <TableCell>
                      <ViewButton onClick={() => router.push(`/admin/suggestions/${s.id}`)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
