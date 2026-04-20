'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdmins } from '@/hooks/useAdmins'
import { AvatarName } from '@/components/ui/AvatarName'
import { DateTimeCell } from '@/components/ui/DateTimeCell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Admin } from '@/types'

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
        ) : !admins.length ? (
          <EmptyState
            title="Nenhum administrador"
            description={hasFilters ? 'Nenhum administrador encontrado para os filtros aplicados.' : 'Administradores aparecerão aqui após serem cadastrados.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {COLS.map((col, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin: Admin) => (
                    <tr key={admin.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <AvatarName name={admin.name} size={32} avatarUrl={admin.avatarUrl} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{admin.email}</td>
                      <td className="px-4 py-3"><DateTimeCell iso={admin.createdAt} /></td>
                      <td className="px-4 py-3">
                        <AdminStatusBadge active={admin.active} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="px-3 py-[5px] border border-indigo-100 bg-white text-indigo-500 rounded-md text-xs font-medium cursor-pointer hover:bg-indigo-50 transition-colors"
                          onClick={() => router.push(`/admins/${admin.id}`)}
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
