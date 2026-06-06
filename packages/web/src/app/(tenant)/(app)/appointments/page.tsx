'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppointments } from '@/hooks/useAppointments'
import { useServices } from '@/hooks/useServices'
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
import { ConfirmStatusModal } from './_components/ConfirmStatusModal'
import { CancelAppointmentModal } from './_components/CancelAppointmentModal'
import { AppointmentStatusBadge } from './_components/AppointmentStatusBadge'
import { ViewButton } from '@/components/navigation/ViewButton'
import { AvatarName } from '@/components/data-display/AvatarName'
import { DateTimeCell } from '@/components/data-display/DateTimeCell'
import { EmptyState } from '@/components/feedback/EmptyState'
import type { Appointment } from '@/types'
import { AppointmentFilters } from './_components/AppointmentFilters'
import { CalendarView } from './_components/CalendarView'
import { CancellationDeadlineBanner } from './_components/CancellationDeadlineBanner'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

export default function AppointmentsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [cancelTarget, setCancelTarget] = useState<{ id: string; startsAt: string } | null>(null)
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

  const [confirmTarget, setConfirmTarget] = useState<{ id: string; action: 'confirm' | 'complete' } | null>(null)
  const { allowPaidStatus } = useTenantSettingsContext()

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

  return (
    <>
      <div>

        {/* Page header: toggle left + "Novo agendamento" right */}
        <div className="flex items-center justify-between mb-4">
          {/* View mode toggle */}
          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm flex">
            <button
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer ${viewMode === 'calendar' ? 'bg-indigo-500 text-white' : 'text-muted-foreground hover:bg-accent'}`}
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
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-indigo-500 text-white' : 'text-muted-foreground hover:bg-accent'}`}
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
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push('/appointments/create')}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          >
            Novo agendamento
          </Button>
        </div>

        <CancellationDeadlineBanner />

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
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {isLoading ? (
              <TableSkeleton cols={7} />
            ) : !appointments.length ? (
              <EmptyState
                title="Nenhum agendamento"
                description={hasFilters ? 'Nenhum agendamento encontrado para os filtros aplicados.' : 'Nenhum agendamento cadastrado.'}
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {['Agendado em', 'Cliente', 'Profissional', 'Serviço', 'Status', 'Cadastrado em', 'Ação'].map(col => (
                        <TableHead key={col}>{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appt: Appointment) => (
                      <TableRow key={appt.id}>
                        <TableCell className="py-3.5">
                          <DateTimeCell iso={appt.startsAt} />
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Link href={`/clients/${appt.clientId}`} className="hover:opacity-75 transition-opacity">
                            <AvatarName name={appt.clientName} avatarUrl={appt.clientAvatarUrl} />
                          </Link>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Link href={`/professionals/${appt.professionalId}`} className="hover:opacity-75 transition-opacity">
                            <AvatarName name={appt.professionalName} avatarUrl={appt.professionalAvatarUrl} />
                          </Link>
                        </TableCell>
                        <TableCell className="py-3.5 whitespace-nowrap text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: appt.serviceColor }} />
                            {appt.serviceName}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <AppointmentStatusBadge
                            status={appt.status}
                            allowPaidStatus={allowPaidStatus}
                            onConfirm={() => setConfirmTarget({ id: appt.id, action: 'confirm' })}
                            onComplete={() => setConfirmTarget({ id: appt.id, action: 'complete' })}
                            onCancel={() => setCancelTarget({ id: appt.id, startsAt: appt.startsAt })}
                          />
                        </TableCell>
                        <TableCell className="py-3.5">
                          <DateTimeCell iso={appt.createdAt} />
                        </TableCell>
                        <TableCell className="py-3.5">
                          <ViewButton onClick={() => router.push(`/appointments/${appt.id}`)} />
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
        )}
      </div>

      <CancelAppointmentModal
        appointmentId={cancelTarget?.id ?? null}
        startsAt={cancelTarget?.startsAt ?? null}
        onClose={() => setCancelTarget(null)}
      />
      <ConfirmStatusModal
        action={confirmTarget?.action ?? null}
        appointmentId={confirmTarget?.id ?? null}
        onClose={() => setConfirmTarget(null)}
      />
    </>
  )
}
