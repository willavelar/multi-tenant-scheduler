'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { listSuperAdminUsers, type SuperAdminUser } from '@/lib/super-admin-api'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/feedback/EmptyState'
import { StatusBadge } from '@/components/feedback/StatusBadge'
import { DateTimeCell } from '@/components/data-display/DateTimeCell'
import { AvatarName } from '@/components/data-display/AvatarName'
import { ViewButton } from '@/components/navigation/ViewButton'
import { TablePagination } from '@/components/navigation/TablePagination'
import { FilterBar } from '@/components/filters/FilterBar'
import { SearchField } from '@/components/filters/SearchField'
import { SelectField } from '@/components/filters/SelectField'

const COLS = ['Nome', 'E-mail', 'Status', 'Criado em', 'Ações']

export default function SuperAdminUsersPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [active, setActive] = useState('')
  const limit = 20

  const hasFilters = !!(q || active)

  const onSearch = (v: string) => { setQ(v); setPage(1) }
  const onStatus = (v: string) => { setActive(v); setPage(1) }
  const onClear  = () => { setQ(''); setActive(''); setPage(1) }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sa-users', page, q, active],
    queryFn: () => listSuperAdminUsers(page, limit, { q: q || undefined, active: active || undefined }),
  })

  const users      = data?.data ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <Button
          variant="primary"
          size="md"
          onClick={() => router.push('/admin/users/new')}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
        >
          Novo usuário
        </Button>
      </div>

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
      </FilterBar>

      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : isError ? (
          <EmptyState title="Erro ao carregar" description="Não foi possível carregar os usuários." />
        ) : !users.length ? (
          <EmptyState
            title="Nenhum usuário"
            description={hasFilters ? 'Nenhum usuário encontrado para os filtros aplicados.' : 'Usuários aparecerão aqui após serem cadastrados.'}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {COLS.map((col, i) => <TableHead key={i}>{col}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: SuperAdminUser) => (
                  <TableRow key={u.id}>
                    <TableCell><AvatarName name={u.name} size={32} avatarUrl={u.avatarUrl} /></TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{u.email}</TableCell>
                    <TableCell>
                      <StatusBadge label={u.active ? 'Ativo' : 'Inativo'} variant={u.active ? 'success' : 'neutral'} />
                    </TableCell>
                    <TableCell><DateTimeCell iso={u.createdAt} /></TableCell>
                    <TableCell><ViewButton onClick={() => router.push(`/admin/users/${u.id}`)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
