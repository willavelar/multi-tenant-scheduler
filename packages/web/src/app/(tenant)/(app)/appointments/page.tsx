'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppointments, useCancelAppointment } from '@/hooks/useAppointments'
import { useServices } from '@/hooks/useServices'
import { AvatarName } from '@/components/ui/AvatarName'
import { DateTimeCell } from '@/components/ui/DateTimeCell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Appointment } from '@/types'
import { AppointmentFilters } from './_components/AppointmentFilters'
import { CalendarView } from './_components/CalendarView'

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

export default function AppointmentsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

  // Filters
  const [dateFrom, setDateFrom] = useState('')  // ISO: yyyy-mm-dd
  const [dateTo,   setDateTo]   = useState('')  // ISO: yyyy-mm-dd
  const [serviceId,    setServiceId]    = useState('')
  const [status,       setStatus]       = useState('')
  const [clientId,       setClientId]       = useState('')
  const [professionalId, setProfessionalId] = useState('')

  // Client autocomplete
  const [clientDisplayValue, setClientDisplayValue] = useState('')

  // Professional autocomplete
  const [professionalDisplayValue, setProfessionalDisplayValue] = useState('')

  const [timeRange, setTimeRange] = useState<'' | 'future' | 'past'>('')

  function localDateStr(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const { data: servicesList = [] } = useServices()

  let effectiveDateFrom = dateFrom
  let effectiveDateTo   = dateTo
  if (timeRange === 'future') {
    effectiveDateFrom = localDateStr(new Date())
    effectiveDateTo   = ''
  } else if (timeRange === 'past') {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    effectiveDateFrom = ''
    effectiveDateTo   = localDateStr(yesterday)
  }

  const filters = { dateFrom: effectiveDateFrom, dateTo: effectiveDateTo, serviceId, status, clientId, professionalId }
  const { data, isLoading } = useAppointments(page, filters)
  const cancel = useCancelAppointment()

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [timeRange, dateFrom, dateTo, serviceId, status, clientId, professionalId])

  const appointments = data?.data ?? []
  const total = data?.total ?? 0
  const limit = data?.limit ?? 10
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const hasFilters = !!(timeRange || dateFrom || dateTo || serviceId || status || clientId || professionalId)

  function clearFilters() {
    setTimeRange('')
    setDateFrom('');  setDateTo('')
    setServiceId(''); setStatus('');  setClientId(''); setProfessionalId('')
    setClientDisplayValue(''); setProfessionalDisplayValue('')
  }

  function selectClient(id: string, name: string) {
    setClientId(id)
    setClientDisplayValue(name)
  }

  function handleClientInput(value: string) {
    setClientDisplayValue(value)
    if (clientId) setClientId('')
  }

  function confirmCancel() {
    if (!cancelId) return
    cancel.mutate(cancelId, { onSuccess: () => setCancelId(null) })
  }

  return (
    <>
      <div>

        {/* Page header: toggle left + "Novo agendamento" right */}
        <div className="flex items-center justify-between mb-4">
          {/* View mode toggle */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex">
            <button
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors ${viewMode === 'calendar' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => setViewMode('calendar')}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Calendário
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors ${viewMode === 'list' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => setViewMode('list')}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
              Listagem
            </button>
          </div>

          {/* Novo agendamento */}
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

        {/* Filters — always visible, viewMode controls what's shown inside */}
        <AppointmentFilters
          viewMode={viewMode}
          timeRange={timeRange}
          dateFrom={dateFrom}
          dateTo={dateTo}
          serviceId={serviceId}
          status={status}
          clientId={clientId}
          professionalId={professionalId}
          clientDisplayValue={clientDisplayValue}
          professionalDisplayValue={professionalDisplayValue}
          servicesList={servicesList}
          hasFilters={hasFilters}
          onTimeRangeChange={setTimeRange}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onServiceIdChange={setServiceId}
          onStatusChange={setStatus}
          onClientInput={handleClientInput}
          onClientSelect={selectClient}
          onClientClear={() => { setClientId(''); setClientDisplayValue('') }}
          onProfessionalInput={v => { setProfessionalDisplayValue(v); if (professionalId) setProfessionalId('') }}
          onProfessionalSelect={(id, name) => { setProfessionalId(id); setProfessionalDisplayValue(name) }}
          onProfessionalClear={() => { setProfessionalId(''); setProfessionalDisplayValue('') }}
          onClearFilters={clearFilters}
        />

        {/* Content */}
        {viewMode === 'calendar' ? (
          <CalendarView filters={{ serviceId, status, clientId, professionalId }} />
        ) : (
          /* List view — table + pagination */
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
                            <Link href={`/clients/${appt.clientId}`} className="hover:opacity-75 transition-opacity">
                              <AvatarName name={appt.clientName} avatarUrl={appt.clientAvatarUrl} />
                            </Link>
                          </td>
                          <td className="px-4 py-3.5">
                            <Link href={`/professionals/${appt.professionalId}`} className="hover:opacity-75 transition-opacity">
                              <AvatarName name={appt.professionalName} avatarUrl={appt.professionalAvatarUrl} />
                            </Link>
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
        )}
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
