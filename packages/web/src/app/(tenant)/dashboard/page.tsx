'use client'

import { useMemo } from 'react'
import { useAppointments, useConfirmAppointment, useCancelAppointment } from '@/hooks/useAppointments'
import { useServices } from '@/hooks/useServices'
import { useProfessionals } from '@/hooks/useProfessionals'
import { useAuth } from '@/providers/AuthProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { Appointment, Service, Professional } from '@/types'

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<Appointment['status'], string> = {
  pending:   'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
}

const STATUS_VARIANT: Record<Appointment['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending:   'secondary',
  confirmed: 'default',
  cancelled: 'destructive',
  completed: 'outline',
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function isToday(iso: string) {
  return iso.slice(0, 10) === todayStr()
}

function isThisMonth(iso: string) {
  const now = new Date()
  const d   = new Date(iso)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ─── stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, color, sub,
}: { label: string; value: number; color: string; sub?: string }) {
  return (
    <Card className={`p-5 border-l-4 ${color} flex flex-col gap-1`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </Card>
  )
}

// ─── status breakdown ────────────────────────────────────────────────────────

const BREAKDOWN_COLORS: Record<Appointment['status'], string> = {
  pending:   'bg-yellow-400',
  confirmed: 'bg-green-500',
  cancelled: 'bg-red-400',
  completed: 'bg-gray-400',
}

function StatusBreakdown({ appointments }: { appointments: Appointment[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 }
    for (const a of appointments) map[a.status] = (map[a.status] ?? 0) + 1
    return map
  }, [appointments])

  return (
    <Card className="p-5 h-full">
      <p className="text-sm font-semibold text-gray-700 mb-4">Status geral</p>
      <div className="space-y-3">
        {(Object.keys(STATUS_LABEL) as Appointment['status'][]).map((s) => (
          <div key={s} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${BREAKDOWN_COLORS[s]}`} />
              <span className="text-sm text-gray-600">{STATUS_LABEL[s]}</span>
            </div>
            <span className="text-sm font-semibold text-gray-800">{counts[s] ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t">
        <p className="text-sm font-semibold text-gray-700 mb-3">Hoje</p>
        {appointments.filter(a => isToday(a.startsAt)).length === 0 ? (
          <p className="text-xs text-gray-400">Nenhum agendamento hoje.</p>
        ) : (
          <div className="space-y-2">
            {appointments
              .filter(a => isToday(a.startsAt))
              .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
              .slice(0, 4)
              .map(a => (
                <div key={a.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{fmtTime(a.startsAt)}</span>
                  <Badge variant={STATUS_VARIANT[a.status]} className="text-xs">
                    {STATUS_LABEL[a.status]}
                  </Badge>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── appointments table ───────────────────────────────────────────────────────

function AppointmentsTable({
  appointments,
  serviceMap,
  professionalMap,
  isAdmin,
  pendingToggle,
  onConfirm,
  onCancel,
}: {
  appointments: Appointment[]
  serviceMap: Map<string, Service>
  professionalMap: Map<string, Professional>
  isAdmin: boolean
  pendingToggle: string | null
  onConfirm: (id: string) => void
  onCancel:  (id: string) => void
}) {
  const sorted = useMemo(
    () => [...appointments].sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    [appointments],
  )

  if (!sorted.length) {
    return (
      <div className="py-12 text-center text-sm text-gray-400">
        Nenhum agendamento encontrado.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50">
          <TableHead className="px-4">Data</TableHead>
          <TableHead className="px-4">Horário</TableHead>
          {isAdmin && <TableHead className="px-4">Profissional</TableHead>}
          <TableHead className="px-4">Serviço</TableHead>
          <TableHead className="px-4">Status</TableHead>
          <TableHead className="px-4">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((appt) => {
          const svc  = serviceMap.get(appt.serviceId)
          const prof = professionalMap.get(appt.professionalId)
          const isLoading = pendingToggle === appt.id
          const todayMark = isToday(appt.startsAt)

          return (
            <TableRow key={appt.id} className={todayMark ? 'bg-indigo-50/40' : ''}>
              <TableCell className="px-4">
                <div className="flex items-center gap-1.5">
                  {todayMark && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  )}
                  <span className="text-sm">{fmtDate(appt.startsAt)}</span>
                </div>
              </TableCell>
              <TableCell className="px-4 font-mono text-sm text-gray-600">
                {fmtTime(appt.startsAt)}–{fmtTime(appt.endsAt)}
              </TableCell>
              {isAdmin && (
                <TableCell className="px-4 text-sm text-gray-600">
                  {prof?.bio ?? appt.professionalId.slice(0, 8) + '…'}
                </TableCell>
              )}
              <TableCell className="px-4 text-sm font-medium">
                {svc?.name ?? '—'}
              </TableCell>
              <TableCell className="px-4">
                <Badge variant={STATUS_VARIANT[appt.status]}>
                  {STATUS_LABEL[appt.status]}
                </Badge>
              </TableCell>
              <TableCell className="px-4">
                {appt.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label="Confirmar"
                      className="h-7 px-2 text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => onConfirm(appt.id)}
                      disabled={isLoading}
                    >
                      ✓
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label="Cancelar"
                      className="h-7 px-2 text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => onCancel(appt.id)}
                      disabled={isLoading}
                    >
                      ✕
                    </Button>
                  </div>
                )}
                {appt.status === 'confirmed' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Cancelar"
                    className="h-7 px-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => onCancel(appt.id)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                )}
                {(appt.status === 'cancelled' || appt.status === 'completed') && (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: appointments = [], isLoading, isError } = useAppointments()
  const { data: services  = [] } = useServices()
  const { data: professionals = [] } = useProfessionals()

  const confirm = useConfirmAppointment()
  const cancel  = useCancelAppointment()

  const pendingToggle = useMemo(() => {
    if (confirm.isPending) return confirm.variables ?? null
    if (cancel.isPending)  return cancel.variables  ?? null
    return null
  }, [confirm.isPending, confirm.variables, cancel.isPending, cancel.variables])

  const serviceMap      = useMemo(() => new Map(services.map(s => [s.id, s])),      [services])
  const professionalMap = useMemo(() => new Map(professionals.map(p => [p.id, p])), [professionals])

  const stats = useMemo(() => ({
    today:     appointments.filter(a => isToday(a.startsAt)).length,
    pending:   appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    thisMonth: appointments.filter(a => isThisMonth(a.startsAt)).length,
  }), [appointments])

  const isAdmin  = user?.role === 'tenant_admin'
  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  if (isLoading) return <p className="text-gray-500 text-sm">Carregando...</p>
  if (isError)   return <p className="text-red-500 text-sm">Erro ao carregar agendamentos.</p>

  return (
    <div className="space-y-6">

      {/* header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 capitalize mt-0.5">{dateLabel}</p>
        </div>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Hoje"
          value={stats.today}
          color="border-indigo-500"
          sub="agendamentos"
        />
        <StatCard
          label="Pendentes"
          value={stats.pending}
          color="border-yellow-400"
          sub="aguardando ação"
        />
        <StatCard
          label="Confirmados"
          value={stats.confirmed}
          color="border-green-500"
          sub="no período"
        />
        <StatCard
          label="Este mês"
          value={stats.thisMonth}
          color="border-slate-400"
          sub="total de agendamentos"
        />
      </div>

      {/* main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* appointments table */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <p className="text-sm font-semibold text-gray-700">Agendamentos</p>
              <Badge variant="secondary" className="text-xs">
                {appointments.length} total
              </Badge>
            </div>
            <AppointmentsTable
              appointments={appointments}
              serviceMap={serviceMap}
              professionalMap={professionalMap}
              isAdmin={isAdmin}
              pendingToggle={pendingToggle}
              onConfirm={(id) => confirm.mutate(id)}
              onCancel={(id)  => cancel.mutate(id)}
            />
          </Card>
        </div>

        {/* right panel */}
        <div className="lg:col-span-1">
          <StatusBreakdown appointments={appointments} />
        </div>

      </div>
    </div>
  )
}
