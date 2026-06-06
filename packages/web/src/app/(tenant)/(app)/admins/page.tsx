'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdmins } from '@/hooks/useAdmins'
import { AvatarName } from '@/components/data-display/AvatarName'
import { DateTimeCell } from '@/components/data-display/DateTimeCell'
import { StatusBadge } from '@/components/feedback/StatusBadge'
import { EmptyState } from '@/components/feedback/EmptyState'
import type { Admin } from '@/types'
import { Button } from '@/components/ui/button'
import { ViewButton } from '@/components/navigation/ViewButton'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

function AdminStatusBadge({ active }: { active: boolean }) {
  return <StatusBadge label={active ? 'Ativo' : 'Inativo'} variant={active ? 'success' : 'error'} />
}

export default function AdminsPage() {
  const router = useRouter()

  const [page, setPage]     = useState(1)
  const [q, setQ]           = useState('')
  const [active, setActive] = useState('')
  const filters = { q: q || undefined, active: active || undefined }
  const { data, isLoading } = useAdmins(page, filters)

  const admins     = data?.data ?? []
  const total      = data?.total ?? 0
  const limit      = data?.limit ?? 10
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const hasFilters = !!(q || active)

  useEffect(() => { setPage(1) }, [q, active])

  const COLS = ['Nome', 'E-mail', 'Cadastrado Em', 'Status', 'Ações']

  return (
    <div className="w-full">

      {/* Header */}
      <div className="flex justify-end mb-4">
        <Button
          variant="primary"
          size="md"
          onClick={() => router.push('/admins/new')}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
        >
          Novo administrador
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-background border border-border rounded-xl px-5 py-4 mb-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">

          {/* Search */}
          <div className="relative min-w-[240px] [flex:2_1_240px]">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-1">Busca</label>
            <div className="relative">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Nome ou e-mail…"
                value={q}
                onChange={e => setQ(e.target.value)}
                className="h-9 w-full pl-[30px] pr-3 text-[13px] text-foreground bg-background border border-border rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
              />
            </div>
          </div>

          {/* Status */}
          <div className="min-w-[160px] [flex:1_1_160px]">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-1">Status</label>
            <div className="relative">
              <select
                value={active}
                onChange={e => setActive(e.target.value)}
                className="h-9 w-full pl-3 pr-8 text-[13px] text-foreground bg-background border border-border rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
              >
                <option value="">Todos</option>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          {/* Clear */}
          {hasFilters && (
            <div className="flex items-end">
              <Button variant="secondary" size="sm" onClick={() => { setQ(''); setActive('') }}>
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : !admins.length ? (
          <EmptyState
            title="Nenhum administrador"
            description={hasFilters ? 'Nenhum administrador encontrado para os filtros aplicados.' : 'Administradores aparecerão aqui após serem cadastrados.'}
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
                {admins.map((admin: Admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <AvatarName name={admin.name} size={32} avatarUrl={admin.avatarUrl} />
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{admin.email}</TableCell>
                    <TableCell><DateTimeCell iso={admin.createdAt} /></TableCell>
                    <TableCell>
                      <AdminStatusBadge active={admin.active} />
                    </TableCell>
                    <TableCell>
                      <ViewButton onClick={() => router.push(`/admins/${admin.id}`)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-[13px] text-muted-foreground m-0">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page <= 1}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                >
                  Próxima
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
