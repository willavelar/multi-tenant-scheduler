'use client'

import { Alert } from '@/components/ui/Alert'
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
    <Alert variant="warning" title="Lembrete: prazo de cancelamento" className="mb-4">
      Você tem agendamentos próximos. O cancelamento deve ser feito com pelo menos{' '}
      <strong>{cancellationDeadlineValue} {unitLabel}</strong> de antecedência.
    </Alert>
  )
}
