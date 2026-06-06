'use client'

import { useState, useId } from 'react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useClients } from '@/hooks/useClients'
import { AvatarName } from '@/components/data-display/AvatarName'
import { DateTimeCell } from '@/components/data-display/DateTimeCell'
import { StatusBadge } from '@/components/feedback/StatusBadge'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useAuth } from '@/providers/AuthProvider'
import type { Client } from '@/types'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ViewButton } from '@/components/navigation/ViewButton'
import { TablePagination } from '@/components/navigation/TablePagination'
import { FilterBar } from '@/components/filters/FilterBar'
import { SearchField } from '@/components/filters/SearchField'
import { SelectField } from '@/components/filters/SelectField'

function formatBirthDate(dateStr: string | null) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function ClientStatusBadge({ active }: { active: boolean | null }) {
  const on = active !== false
  return <StatusBadge label={on ? 'Ativo' : 'Inativo'} variant={on ? 'success' : 'error'} />
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
      <div className={cn('relative w-9 h-5 rounded-full transition-colors', checked ? 'bg-indigo-500' : 'bg-border')}>
        <div className={cn('absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform', checked ? 'translate-x-4' : 'translate-x-0')} />
      </div>
      <span className="text-[13px] text-foreground">{label}</span>
    </label>
  )
}

export default function ClientsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.role === 'tenant_admin'
  const isProfessional = user?.role === 'professional'

  const [page, setPage]         = useState(1)
  const [q, setQ]               = useState('')
  const [active, setActive]     = useState('')
  const [myClients, setMyClients] = useState(() => isProfessional)
  const filters = { q: q || undefined, active: active || undefined, myClients: myClients || undefined }
  const { data, isLoading } = useClients(page, filters)

  const clients    = data?.data ?? []
  const total      = data?.total ?? 0
  const limit      = data?.limit ?? 10
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const hasFilters = !!(q || active)

  const onSearch     = (v: string) => { setQ(v); setPage(1) }
  const onStatus     = (v: string) => { setActive(v); setPage(1) }
  const onMyClients  = (v: boolean) => { setMyClients(v); setPage(1) }
  const onClear      = () => { setQ(''); setActive(''); setPage(1) }

  const COLS = ['Cliente', 'Telefone', 'Nascimento', 'Último login', 'Cadastrado em', 'Status', 'Ações']

  return (
    <div className="w-full">

      {/* Header row */}
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push('/clients/new')}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          >
            Novo cliente
          </Button>
        </div>
      )}

      {/* Filters */}
      <FilterBar showClear={hasFilters} onClear={onClear}>
        <SearchField value={q} onChange={onSearch} placeholder="Nome ou e-mail…" />
        <SelectField
          label="Status"
          value={active}
          onChange={onStatus}
          options={[
            { value: '', label: 'Todos' },
            { value: 'true', label: 'Ativo' },
            { value: 'false', label: 'Inativo' },
          ]}
        />

        {/* Apenas meus clientes — only visible to professionals */}
        {isProfessional && (
          <div className="flex items-end pb-[5px]">
            <Toggle checked={myClients} onChange={onMyClients} label="Apenas meus clientes" />
          </div>
        )}
      </FilterBar>

      {/* Table card */}
      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton cols={7} />
        ) : !clients.length ? (
          <EmptyState
            title="Nenhum cliente"
            description={hasFilters ? 'Nenhum cliente encontrado para os filtros aplicados.' : 'Clientes aparecerão aqui após se cadastrarem.'}
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
                {clients.map((client: Client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <AvatarName name={client.name} size={32} avatarUrl={client.avatarUrl} />
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{client.phone ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{formatBirthDate(client.birthDate)}</TableCell>
                    <TableCell><DateTimeCell iso={client.lastLoginAt} /></TableCell>
                    <TableCell><DateTimeCell iso={client.createdAt} /></TableCell>
                    <TableCell>
                      <ClientStatusBadge active={client.active} />
                    </TableCell>
                    <TableCell>
                      <ViewButton onClick={() => router.push(`/clients/${client.id}`)} />
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
