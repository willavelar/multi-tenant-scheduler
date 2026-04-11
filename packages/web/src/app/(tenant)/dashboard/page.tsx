'use client'

import { useMemo } from 'react'
import { useAppointments, useConfirmAppointment, useCancelAppointment } from '@/hooks/useAppointments'
import { useServices } from '@/hooks/useServices'
import { useProfessionals } from '@/hooks/useProfessionals'
import { useAuth } from '@/providers/AuthProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Appointment, Service, Professional } from '@/types'

// ─── theme tokens ────────────────────────────────────────────────────────────

const T = {
  display: "var(--font-playfair, 'Playfair Display', Georgia, serif)",
  mono:    "var(--font-jetbrains, 'JetBrains Mono', 'Courier New', monospace)",
  hero:    '#0e1117',
  amber:   '#e8960a',
  emerald: '#0d9669',
  rose:    '#e03b3b',
  slate:   '#64748b',
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<Appointment['status'], { label: string; color: string; dot: string }> = {
  pending:   { label: 'Pendente',   color: '#92400e', dot: '#f59e0b' },
  confirmed: { label: 'Confirmado', color: '#065f46', dot: '#10b981' },
  cancelled: { label: 'Cancelado',  color: '#991b1b', dot: '#ef4444' },
  completed: { label: 'Concluído',  color: '#374151', dot: '#9ca3af' },
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function todayStr() { return new Date().toISOString().slice(0, 10) }
function isToday(iso: string) { return iso.slice(0, 10) === todayStr() }
function isThisMonth(iso: string) {
  const n = new Date(); const d = new Date(iso)
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function fmtDateShort(iso: string) {
  const d = new Date(iso)
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// ─── stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, accentColor, note,
}: { label: string; value: number; accentColor: string; note: string }) {
  return (
    <div
      className="relative bg-white rounded-2xl p-6 overflow-hidden"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      {/* top accent line */}
      <div
        className="absolute top-0 left-6 right-6 h-[2px] rounded-full"
        style={{ background: accentColor }}
      />
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 mt-2">
        {label}
      </p>
      <p
        className="text-6xl font-bold leading-none mt-2"
        style={{ fontFamily: T.display, color: '#0e1117', letterSpacing: '-0.03em' }}
      >
        {value}
      </p>
      <p className="text-[11px] text-gray-400 mt-2">{note}</p>
    </div>
  )
}

// ─── today hero ───────────────────────────────────────────────────────────────

function TodayHero({
  appointments, serviceMap, onCancel, pendingId,
}: {
  appointments: Appointment[]
  serviceMap: Map<string, Service>
  onCancel: (id: string) => void
  pendingId: string | null
}) {
  const today = useMemo(
    () => appointments
      .filter(a => isToday(a.startsAt))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [appointments],
  )

  return (
    <div
      className="rounded-2xl p-6 flex flex-col"
      style={{ background: T.hero, minHeight: 340 }}
    >
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: T.amber }}>
            Agenda de Hoje
          </p>
          <p className="text-white text-sm font-medium mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        <div
          className="text-3xl font-bold leading-none"
          style={{ fontFamily: T.display, color: T.amber }}
        >
          {today.length}
        </div>
      </div>

      {/* timeline */}
      {today.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Nenhum agendamento hoje
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-1">
          {today.map((appt, i) => {
            const meta = STATUS_META[appt.status]
            const svc  = serviceMap.get(appt.serviceId)
            return (
              <div
                key={appt.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors"
                style={{
                  background: i === 0 ? 'rgba(232,150,10,0.12)' : 'rgba(255,255,255,0.04)',
                  borderLeft: i === 0 ? `2px solid ${T.amber}` : '2px solid transparent',
                }}
              >
                {/* time */}
                <span
                  className="text-[13px] font-medium w-12 shrink-0"
                  style={{ fontFamily: T.mono, color: i === 0 ? T.amber : 'rgba(255,255,255,0.5)' }}
                >
                  {fmtTime(appt.startsAt)}
                </span>
                {/* dot */}
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: meta.dot }}
                />
                {/* service */}
                <span className="flex-1 text-sm font-medium text-white truncate">
                  {svc?.name ?? '—'}
                </span>
                {/* action */}
                {(appt.status === 'pending' || appt.status === 'confirmed') && (
                  <button
                    onClick={() => onCancel(appt.id)}
                    disabled={pendingId === appt.id}
                    className="text-[11px] transition-colors disabled:opacity-40"
                    style={{ color: 'rgba(255,255,255,0.3)', fontFamily: T.mono }}
                  >
                    cancelar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── upcoming list ────────────────────────────────────────────────────────────

function UpcomingList({
  appointments, serviceMap, professionalMap, isAdmin, onConfirm, onCancel, pendingId,
}: {
  appointments: Appointment[]
  serviceMap: Map<string, Service>
  professionalMap: Map<string, Professional>
  isAdmin: boolean
  onConfirm: (id: string) => void
  onCancel: (id: string) => void
  pendingId: string | null
}) {
  const rows = useMemo(
    () => [...appointments]
      .filter(a => !isToday(a.startsAt) || a.status === 'cancelled' || a.status === 'completed')
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
      .slice(0, 12),
    [appointments],
  )

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      {/* header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <p
          className="text-[11px] uppercase tracking-[0.14em] font-semibold text-gray-400"
        >
          Agendamentos
        </p>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: '#f2efe9', color: '#92400e' }}
        >
          {appointments.length} total
        </span>
      </div>

      {rows.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-300">
          Nenhum agendamento fora de hoje.
        </div>
      )}

      {/* rows */}
      <div className="divide-y divide-gray-50">
        {rows.map((appt) => {
          const meta = STATUS_META[appt.status]
          const svc  = serviceMap.get(appt.serviceId)
          const prof = professionalMap.get(appt.professionalId)

          return (
            <div
              key={appt.id}
              className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/60 transition-colors group"
            >
              {/* date */}
              <div className="w-24 shrink-0">
                <p className="text-xs font-medium text-gray-700">{fmtDateShort(appt.startsAt)}</p>
                <p
                  className="text-[11px] mt-0.5"
                  style={{ fontFamily: T.mono, color: '#94a3b8' }}
                >
                  {fmtTime(appt.startsAt)}
                </p>
              </div>

              {/* dot */}
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: meta.dot }}
              />

              {/* info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{svc?.name ?? '—'}</p>
                {isAdmin && (
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">
                    {prof?.bio ?? appt.professionalId.slice(0, 8) + '…'}
                  </p>
                )}
              </div>

              {/* status badge */}
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: `${meta.dot}18`, color: meta.color }}
              >
                {meta.label}
              </span>

              {/* actions */}
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {appt.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onConfirm(appt.id)}
                      disabled={pendingId === appt.id}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-40"
                      style={{ background: '#d1fae5', color: T.emerald }}
                      aria-label="Confirmar"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => onCancel(appt.id)}
                      disabled={pendingId === appt.id}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-40"
                      style={{ background: '#fee2e2', color: T.rose }}
                      aria-label="Cancelar"
                    >
                      ✕
                    </button>
                  </>
                )}
                {appt.status === 'confirmed' && (
                  <button
                    onClick={() => onCancel(appt.id)}
                    disabled={pendingId === appt.id}
                    className="text-[11px] font-medium transition-colors disabled:opacity-40"
                    style={{ color: '#d1d5db', fontFamily: T.mono }}
                    aria-label="Cancelar"
                  >
                    cancelar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── status bar ───────────────────────────────────────────────────────────────

function StatusBar({ appointments }: { appointments: Appointment[] }) {
  const total = appointments.length || 1
  const counts = useMemo(() => {
    const m: Record<string, number> = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 }
    appointments.forEach(a => { m[a.status] = (m[a.status] ?? 0) + 1 })
    return m
  }, [appointments])

  const segments: { status: Appointment['status']; pct: number }[] = [
    { status: 'confirmed', pct: (counts.confirmed / total) * 100 },
    { status: 'pending',   pct: (counts.pending   / total) * 100 },
    { status: 'completed', pct: (counts.completed  / total) * 100 },
    { status: 'cancelled', pct: (counts.cancelled  / total) * 100 },
  ]

  return (
    <div
      className="bg-white rounded-2xl px-6 py-5"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-4">
        {segments.map(({ status, pct }) =>
          pct > 0 ? (
            <div
              key={status}
              className="rounded-full transition-all"
              style={{ width: `${pct}%`, background: STATUS_META[status].dot }}
            />
          ) : null
        )}
      </div>
      {/* legend */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-4">
        {(Object.keys(STATUS_META) as Appointment['status'][]).map(s => (
          <div key={s} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: STATUS_META[s].dot }}
              />
              <span className="text-xs text-gray-500">{STATUS_META[s].label}</span>
            </div>
            <span
              className="text-xs font-semibold"
              style={{ fontFamily: T.mono, color: '#374151' }}
            >
              {counts[s] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user }                                          = useAuth()
  const { data: appointments = [], isLoading, isError }   = useAppointments()
  const { data: services     = [] }                       = useServices()
  const { data: professionals = [] }                      = useProfessionals()

  const confirm = useConfirmAppointment()
  const cancel  = useCancelAppointment()

  const pendingId = useMemo(() => {
    if (confirm.isPending) return confirm.variables ?? null
    if (cancel.isPending)  return cancel.variables  ?? null
    return null
  }, [confirm.isPending, confirm.variables, cancel.isPending, cancel.variables])

  const serviceMap      = useMemo(() => new Map(services.map(s      => [s.id, s])),      [services])
  const professionalMap = useMemo(() => new Map(professionals.map(p => [p.id, p])), [professionals])

  const stats = useMemo(() => ({
    today:     appointments.filter(a => isToday(a.startsAt)).length,
    pending:   appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    thisMonth: appointments.filter(a => isThisMonth(a.startsAt)).length,
  }), [appointments])

  const isAdmin = user?.role === 'tenant_admin'
  const greeting = isAdmin ? 'Visão geral' : 'Minha agenda'

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="animate-pulse">●</span> Carregando…
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-red-500">Erro ao carregar agendamentos.</p>
  }

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p
            className="text-[11px] uppercase tracking-[0.15em] font-semibold"
            style={{ color: '#a8956b' }}
          >
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1
            className="text-3xl font-bold mt-0.5"
            style={{ fontFamily: T.display, color: '#0e1117', letterSpacing: '-0.02em' }}
          >
            {greeting}
          </h1>
        </div>
        <p className="text-xs text-gray-400 mb-1">
          {user?.email}
        </p>
      </div>

      {/* ── stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Hoje"          value={stats.today}     accentColor={T.amber}   note="agendamentos" />
        <StatCard label="Pendentes"     value={stats.pending}   accentColor="#f59e0b"   note="aguardando ação" />
        <StatCard label="Confirmados"   value={stats.confirmed} accentColor={T.emerald} note="no período" />
        <StatCard label="Este mês"      value={stats.thisMonth} accentColor="#94a3b8"   note="total" />
      </div>

      {/* ── main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* today column */}
        <div className="flex flex-col gap-4">
          <TodayHero
            appointments={appointments}
            serviceMap={serviceMap}
            onCancel={(id) => cancel.mutate(id)}
            pendingId={pendingId}
          />
          <StatusBar appointments={appointments} />
        </div>

        {/* upcoming column */}
        <div className="lg:col-span-2">
          <UpcomingList
            appointments={appointments}
            serviceMap={serviceMap}
            professionalMap={professionalMap}
            isAdmin={isAdmin}
            onConfirm={(id) => confirm.mutate(id)}
            onCancel={(id)  => cancel.mutate(id)}
            pendingId={pendingId}
          />
        </div>

      </div>
    </div>
  )
}
