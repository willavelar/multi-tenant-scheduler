'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAppointments, useCancelAppointment } from '@/hooks/useAppointments'
import { useSearchClients } from '@/hooks/useClients'
import { useServices } from '@/hooks/useServices'
import { AvatarName } from '@/components/ui/AvatarName'
import { DateTimeCell } from '@/components/ui/DateTimeCell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Appointment } from '@/types'

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending:   'Agendado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Pago',
}

const STATUS_VARIANTS: Record<Appointment['status'], import('@/components/ui/StatusBadge').StatusVariant> = {
  pending:   'warning',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'purple',
}

// Mask dd/mm/yyyy as the user types
function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

// Convert dd/mm/yyyy → yyyy-mm-dd for the API (returns '' if incomplete/invalid)
function toIso(masked: string): string {
  const m = masked.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return ''
  const [, d, mo, y] = m
  const date = new Date(`${y}-${mo}-${d}`)
  if (isNaN(date.getTime())) return ''
  return `${y}-${mo}-${d}`
}

export default function AppointmentsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [cancelId, setCancelId] = useState<string | null>(null)

  // Filters
  const [dateFromMask, setDateFromMask] = useState('')  // display: dd/mm/yyyy
  const [dateToMask,   setDateToMask]   = useState('')  // display: dd/mm/yyyy
  const [dateFrom,     setDateFrom]     = useState('')  // API: yyyy-mm-dd
  const [dateTo,       setDateTo]       = useState('')  // API: yyyy-mm-dd
  const [serviceId,    setServiceId]    = useState('')
  const [status,       setStatus]       = useState('')
  const [clientId,     setClientId]     = useState('')

  // Client autocomplete
  const [clientQuery,        setClientQuery]        = useState('')
  const [clientDisplayValue, setClientDisplayValue] = useState('')
  const [clientDropOpen,     setClientDropOpen]     = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)

  const { data: clientResults = [], isFetching: searchingClients } = useSearchClients(clientQuery)
  const { data: servicesList = [] } = useServices()

  const filters = { dateFrom, dateTo, serviceId, status, clientId }
  const { data, isLoading } = useAppointments(page, filters)
  const cancel = useCancelAppointment()

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [dateFrom, dateTo, serviceId, status, clientId])

  // Close client dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setClientDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const appointments = data?.data ?? []
  const total = data?.total ?? 0
  const limit = data?.limit ?? 10
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const hasFilters = !!(dateFrom || dateTo || serviceId || status || clientId)

  function clearFilters() {
    setDateFromMask(''); setDateToMask('')
    setDateFrom('');     setDateTo('')
    setServiceId('');    setStatus('');    setClientId('')
    setClientQuery('');  setClientDisplayValue('')
  }

  function selectClient(id: string, name: string) {
    setClientId(id)
    setClientDisplayValue(name)
    setClientQuery('')
    setClientDropOpen(false)
  }

  function handleClientInput(value: string) {
    setClientDisplayValue(value)
    if (clientId) { setClientId(''); }
    setClientQuery(value)
    setClientDropOpen(value.length >= 3)
  }

  function confirmCancel() {
    if (!cancelId) return
    cancel.mutate(cancelId, { onSuccess: () => setCancelId(null) })
  }

  return (
    <>
      <div>

        {/* Page header */}
        <div className="flex justify-end mb-4">
          <button
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
            onClick={() => router.push('/appointments/create')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo agendamento
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">

            {/* Date From */}
            <div className="min-w-[140px] flex-[1_1_140px]">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">De</label>
              <input
                type="text"
                className="h-9 w-full px-3 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
                placeholder="dd/mm/aaaa"
                value={dateFromMask}
                onChange={e => {
                  const masked = applyDateMask(e.target.value)
                  setDateFromMask(masked)
                  setDateFrom(toIso(masked))
                }}
                maxLength={10}
              />
            </div>

            {/* Date To */}
            <div className="min-w-[140px] flex-[1_1_140px]">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">Até</label>
              <input
                type="text"
                className="h-9 w-full px-3 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
                placeholder="dd/mm/aaaa"
                value={dateToMask}
                onChange={e => {
                  const masked = applyDateMask(e.target.value)
                  setDateToMask(masked)
                  setDateTo(toIso(masked))
                }}
                maxLength={10}
              />
            </div>

            {/* Service */}
            <div className="min-w-[160px] flex-[1_1_160px]">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">Serviço</label>
              <div className="relative">
                <select
                  className="h-9 w-full pl-3 pr-8 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
                  value={serviceId}
                  onChange={e => setServiceId(e.target.value)}
                >
                  <option value="">Todos</option>
                  {servicesList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>

            {/* Status */}
            <div className="min-w-[140px] flex-[1_1_140px]">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">Status</label>
              <div className="relative">
                <select
                  className="h-9 w-full pl-3 pr-8 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="pending">Agendado</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="completed">Pago</option>
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>

            {/* Client search */}
            <div className="min-w-[200px] flex-[2_1_200px] relative" ref={clientRef}>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">Cliente</label>
              <div className="relative">
                <svg
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                >
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  className="h-9 w-full pl-[30px] pr-[30px] text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
                  placeholder="Buscar por nome ou e-mail…"
                  value={clientDisplayValue}
                  onChange={e => handleClientInput(e.target.value)}
                  onFocus={() => { if (clientQuery.length >= 3) setClientDropOpen(true) }}
                />
                {clientId && (
                  <button
                    onClick={() => { setClientId(''); setClientDisplayValue(''); setClientQuery('') }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer text-gray-400 flex p-0.5"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {clientDropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-top-1.5 duration-150">
                  {searchingClients ? (
                    <p className="px-3 py-2.5 text-[13px] text-gray-400 m-0">Buscando...</p>
                  ) : clientResults.length === 0 ? (
                    <p className="px-3 py-2.5 text-[13px] text-gray-400 m-0">Nenhum cliente encontrado</p>
                  ) : clientResults.map(c => (
                    <button
                      key={c.id}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer border-0 bg-transparent w-full text-left hover:bg-gray-50 transition-colors"
                      onClick={() => selectClient(c.id, c.name)}
                    >
                      <AvatarName name={c.name} subtitle={c.email} size={28} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear */}
            {hasFilters && (
              <div className="flex items-end">
                <button
                  className="h-9 px-3.5 border border-gray-200 bg-white text-gray-500 rounded-lg text-[13px] font-medium cursor-pointer hover:bg-gray-100 hover:text-gray-700 transition-colors whitespace-nowrap"
                  onClick={clearFilters}
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
          ) : !appointments.length ? (
            <EmptyState
              title="Nenhum agendamento"
              description={hasFilters ? 'Nenhum agendamento encontrado para os filtros aplicados.' : 'Nenhum agendamento cadastrado.'}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Agendado em', 'Cliente', 'Profissional', 'Serviço', 'Status', 'Cadastrado em', 'Ação'].map(col => (
                        <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt: Appointment) => (
                      <tr key={appt.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3.5">
                          <DateTimeCell iso={appt.startsAt} />
                        </td>
                        <td className="px-4 py-3.5">
                          <AvatarName name={appt.clientName} />
                        </td>
                        <td className="px-4 py-3.5">
                          <AvatarName name={appt.professionalName} />
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-gray-500">
                          {appt.serviceName}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge
                            label={STATUS_LABELS[appt.status]}
                            variant={STATUS_VARIANTS[appt.status]}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <DateTimeCell iso={appt.createdAt} />
                        </td>
                        <td className="px-4 py-3.5">
                          {(appt.status === 'pending' || appt.status === 'confirmed') && (
                            <button
                              className="px-3 py-[5px] border border-red-200 bg-white text-red-600 rounded-md text-[12px] font-medium cursor-pointer hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              onClick={() => setCancelId(appt.id)}
                            >
                              Cancelar
                            </button>
                          )}
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
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page <= 1}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    Anterior
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages}
                  >
                    Próxima
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {cancelId && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => !cancel.isPending && setCancelId(null)}
        >
          <div
            className="bg-white rounded-xl p-7 w-full max-w-[400px] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>

            <h2 className="text-base font-bold text-gray-900 m-0 mb-2">
              Cancelar agendamento
            </h2>
            <p className="text-[13.5px] text-gray-500 m-0 mb-6 leading-relaxed">
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </p>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setCancelId(null)}
                disabled={cancel.isPending}
                className="px-4 py-[9px] border border-gray-200 bg-white text-gray-700 text-[13.5px] font-semibold rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancel.isPending}
                className="px-5 py-[9px] bg-red-600 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 transition-colors"
              >
                {cancel.isPending ? 'Cancelando...' : 'Sim, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
