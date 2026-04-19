'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfessionalsPage } from '@/hooks/useProfessionals'
import { AvatarName } from '@/components/ui/AvatarName'
import { DateTimeCell } from '@/components/ui/DateTimeCell'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Professional } from '@/types'

const COLS = ['Profissional', 'Cargo', 'Função', 'Último login', 'Cadastrado em', 'Status', 'Ações']

export default function ProfessionalsPage() {
  const router = useRouter()
  const [page, setPage]     = useState(1)
  const [q, setQ]           = useState('')
  const [active, setActive] = useState('')
  const filters = { q: q || undefined, active: active || undefined }
  const { data, isLoading } = useProfessionalsPage(page, filters)

  const professionals = data?.data ?? []
  const total         = data?.total ?? 0
  const limit         = data?.limit ?? 10
  const totalPages    = Math.max(1, Math.ceil(total / limit))
  const hasFilters    = !!(q || active)

  useEffect(() => { setPage(1) }, [q, active])

  return (
    <div className="w-full">

      {/* Header */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => router.push('/professionals/new')}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo profissional
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">

          {/* Search */}
          <div className="relative min-w-[240px] [flex:2_1_240px]">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">Busca</label>
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
                className="h-9 w-full pl-[30px] pr-3 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
              />
            </div>
          </div>

          {/* Status */}
          <div className="min-w-[160px] [flex:1_1_160px]">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">Status</label>
            <div className="relative">
              <select
                value={active}
                onChange={e => setActive(e.target.value)}
                className="h-9 w-full pl-3 pr-8 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
              >
                <option value="">Todos</option>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          {/* Clear */}
          {hasFilters && (
            <div className="flex items-end">
              <button
                className="h-9 px-3.5 bg-white text-gray-500 border border-gray-200 rounded-lg text-[13px] font-medium cursor-pointer hover:bg-gray-100 hover:text-gray-700 whitespace-nowrap transition-colors"
                onClick={() => { setQ(''); setActive('') }}
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Carregando...</div>
        ) : !professionals.length ? (
          <EmptyState
            title="Nenhum profissional"
            description={hasFilters ? 'Nenhum profissional encontrado para os filtros aplicados.' : 'Clique em "Novo profissional" para adicionar.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {COLS.map(col => (
                      <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {professionals.map((prof: Professional) => (
                    <tr key={prof.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          className="block w-full text-left bg-transparent border-0 p-0 cursor-pointer"
                          onClick={() => router.push(`/professionals/${prof.id}`)}
                        >
                          <AvatarName name={prof.name} subtitle={prof.email} avatarUrl={prof.avatarUrl} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{prof.position ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {prof.role === 'tenant_admin' ? 'Administrador' : 'Profissional'}
                      </td>
                      <td className="px-4 py-3"><DateTimeCell iso={prof.lastLoginAt} /></td>
                      <td className="px-4 py-3"><DateTimeCell iso={prof.createdAt} /></td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={prof.active ? 'Ativo' : 'Inativo'}
                          variant={prof.active ? 'success' : 'neutral'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="px-3 py-[5px] border border-indigo-100 bg-white text-indigo-500 rounded-md text-xs font-medium cursor-pointer hover:bg-indigo-50 transition-colors"
                          onClick={() => router.push(`/professionals/${prof.id}`)}
                        >
                          Visualizar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-[13px] text-gray-500 m-0">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page <= 1}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Anterior
                </button>
                <button
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                >
                  Próxima
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
