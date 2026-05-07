'use client'

import { useAuth } from '@/providers/AuthProvider'
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
import { useAppointmentsCalendar } from '@/hooks/useAppointments'

const UNIT_MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 } as const

const UNIT_LABEL: Record<'minutes' | 'hours' | 'days', [string, string]> = {
  minutes: ['minuto',  'minutos'],
  hours:   ['hora',    'horas'],
  days:    ['dia',     'dias'],
}

function isoDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function CancellationDeadlineBanner() {
  const { user } = useAuth()
  const { cancellationDeadlineValue, cancellationDeadlineUnit } = useTenantSettingsContext()

  const isClient = user?.role === 'client'
  const deadlineConfigured = !!cancellationDeadlineValue && !!cancellationDeadlineUnit
  const enabled = isClient && deadlineConfigured

  const now = Date.now()
  const deadlineMs = enabled ? cancellationDeadlineValue! * UNIT_MS[cancellationDeadlineUnit!] : 0
  const warningWindowMs = 2 * deadlineMs

  const today = isoDateStr(new Date(now))
  const warningEndDate = isoDateStr(new Date(now + warningWindowMs))

  const { data: appointments = [] } = useAppointmentsCalendar(
    enabled ? today : '',
    enabled ? warningEndDate : '',
  )

  const hasQualifying = appointments.some(appt => {
    if (appt.status !== 'pending' && appt.status !== 'confirmed') return false
    const startsAtMs = new Date(appt.startsAt).getTime()
    // Future, within warning window, and not yet past the cancellation deadline
    return startsAtMs > now && startsAtMs > now + deadlineMs && startsAtMs <= now + warningWindowMs
  })

  if (!enabled || !hasQualifying) return null

  const [singular, plural] = UNIT_LABEL[cancellationDeadlineUnit!]
  const unitLabel = cancellationDeadlineValue === 1 ? singular : plural

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-[13px]">
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5 text-amber-500">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div>
        <p className="font-semibold text-amber-800 leading-snug m-0">Lembrete: prazo de cancelamento</p>
        <p className="text-amber-700 mt-0.5 leading-snug m-0">
          Você tem agendamentos próximos. O cancelamento deve ser feito com pelo menos{' '}
          <strong>{cancellationDeadlineValue} {unitLabel}</strong> de antecedência.
        </p>
      </div>
    </div>
  )
}
