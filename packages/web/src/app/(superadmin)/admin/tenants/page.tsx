'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { superAdminFetch } from '@/lib/super-admin-api'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/feedback/EmptyState'
import { StatusBadge } from '@/components/feedback/StatusBadge'
import { DateTimeCell } from '@/components/data-display/DateTimeCell'
import { ViewButton } from '@/components/navigation/ViewButton'
import { TablePagination } from '@/components/navigation/TablePagination'
import { FilterBar } from '@/components/filters/FilterBar'
import { SearchField } from '@/components/filters/SearchField'
import { SelectField } from '@/components/filters/SelectField'

interface Tenant {
  id: string
  slug: string
  name: string
  active: boolean
  createdAt: string
}

interface TenantsPage {
  data: Tenant[]
  total: number
  page: number
  limit: number
}

const COLS = ['Nome', 'Slug', 'Status', 'Criado em', 'Ações']

export default function TenantsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [active, setActive] = useState('')
  const limit = 20

  const hasFilters = !!(q || active)

  const onSearch = (v: string) => { setQ(v); setPage(1) }
  const onStatus = (v: string) => { setActive(v); setPage(1) }
  const onClear  = () => { setQ(''); setActive(''); setPage(1) }

  const { data, isLoading, isError } = useQuery<TenantsPage>({
    queryKey: ['sa-tenants', page, q, active],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (q) params.set('q', q)
      if (active) params.set('active', active)
      const res = await superAdminFetch(`/super-admin/tenants?${params.toString()}`)
      return res.json()
    },
  })

  const tenants    = data?.data ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1

  return (
    <div className="w-full">

      {/* Header row */}
      <div className="flex justify-end mb-4">
        <Button
          variant="primary"
          size="md"
          onClick={() => router.push('/admin/tenants/new')}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
        >
          Novo tenant
        </Button>
      </div>

      {/* Filters */}
      <FilterBar showClear={hasFilters} onClear={onClear}>
        <SearchField value={q} onChange={onSearch} placeholder="Nome ou slug…" />
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

      {/* Table card */}
      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : isError ? (
          <EmptyState title="Erro ao carregar" description="Não foi possível carregar os tenants." />
        ) : !tenants.length ? (
          <EmptyState
            title="Nenhum tenant"
            description={hasFilters ? 'Nenhum tenant encontrado para os filtros aplicados.' : 'Tenants aparecerão aqui após serem cadastrados.'}
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
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{tenant.slug}</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={tenant.active ? 'Ativo' : 'Inativo'}
                        variant={tenant.active ? 'success' : 'neutral'}
                      />
                    </TableCell>
                    <TableCell><DateTimeCell iso={tenant.createdAt} /></TableCell>
                    <TableCell>
                      <ViewButton onClick={() => router.push(`/admin/tenants/${tenant.id}`)} />
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
