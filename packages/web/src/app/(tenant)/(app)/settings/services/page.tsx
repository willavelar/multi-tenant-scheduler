'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { useServices } from '@/hooks/useServices'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import type { Service } from '@/types'
import { Button } from '@/components/ui/button'

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export default function ServicesPage() {
  const router = useRouter()
  const { data: services = [], isLoading } = useServices()

  const [q, setQ]           = useState('')
  const [active, setActive] = useState('')

  const hasFilters = !!(q || active)

  const filtered = useMemo(() => {
    return services.filter((s: Service) => {
      const matchQ = !q || s.name.toLowerCase().includes(q.toLowerCase())
      const matchActive =
        !active ||
        (active === 'true' ? s.active : !s.active)
      return matchQ && matchActive
    })
  }, [services, q, active])

  const COLS = ['Nome', 'Duração', 'Descrição', 'Status', 'Ações']

  return (
    <div className="w-full">

      {/* Header row */}
      <div className="flex justify-end mb-4">
        <Button
          variant="primary"
          size="md"
          onClick={() => router.push('/settings/services/new')}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
        >
          Novo serviço
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-background border border-border rounded-xl px-5 py-4 mb-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">

          <div className="relative min-w-[240px] [flex:2_1_240px]">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-1">Busca</label>
            <div className="relative">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Nome do serviço…"
                value={q}
                onChange={e => setQ(e.target.value)}
                className="h-9 w-full pl-[30px] pr-3 text-[13px] text-foreground bg-background border border-border rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
              />
            </div>
          </div>

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
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

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
        ) : !filtered.length ? (
          <EmptyState
            title="Nenhum serviço"
            description={hasFilters ? 'Nenhum serviço encontrado para os filtros aplicados.' : 'Serviços criados aparecerão aqui.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  {COLS.map((col, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((service: Service) => (
                  <tr key={service.id} className="border-b border-border transition-colors hover:bg-accent">
                    <td className="px-4 py-3 font-medium text-foreground">{service.name}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDuration(service.durationMinutes)}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[280px] truncate">{service.description ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={service.active ? 'Ativo' : 'Inativo'} variant={service.active ? 'success' : 'error'} />
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="primary" size="xs" onClick={() => router.push(`/settings/services/${service.id}`)}>
                        Visualizar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
