'use client'

import Link from 'next/link'
import { BackButton } from '@/components/navigation/BackButton'
import { DetailCard } from '@/components/sections/DetailCard'
import { FieldRow } from '@/components/data-display/FieldRow'
import { StatusBadge } from '@/components/feedback/StatusBadge'
import type { StatusVariant } from '@/components/feedback/StatusBadge'
import { AvatarName } from '@/components/data-display/AvatarName'
import type { AppointmentDetail } from '@/types'
import { useFormatTime } from '@/hooks/useFormatTime'

const STATUS_LABELS: Record<AppointmentDetail['status'], string> = {
  pending:                   'Aguardando confirmação',
  confirmed:                 'Confirmado',
  cancelled_by_client:       'Cancelado pelo cliente',
  cancelled_by_professional: 'Cancelado pelo profissional',
  completed:                 'Pago',
}

const STATUS_VARIANTS: Record<AppointmentDetail['status'], StatusVariant> = {
  pending:                   'warning',
  confirmed:                 'success',
  cancelled_by_client:       'error',
  cancelled_by_professional: 'error',
  completed:                 'purple',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
}

function formatCreatedAt(iso: string) {
  const d = new Date(iso)
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} às ${time}`
}

type Props = {
  appointment: AppointmentDetail
}

export function AppointmentDetailView({ appointment: appt }: Props) {
  const { formatISOTime } = useFormatTime()

  return (
    <div>
      <div className="flex items-center mb-7">
        <BackButton href="/appointments">Voltar para agendamentos</BackButton>
      </div>

      {/* Appointment info */}
      <DetailCard>
        <p className="text-sm font-bold text-foreground pt-5 pb-1">Agendamento</p>
        <FieldRow label="Status" value={
          <StatusBadge label={STATUS_LABELS[appt.status]} variant={STATUS_VARIANTS[appt.status]} />
        } />
        <FieldRow label="Serviço"    value={appt.serviceName} />
        <FieldRow label="Data"       value={formatDate(appt.startsAt)} />
        <FieldRow label="Horário"    value={`${formatISOTime(appt.startsAt)} – ${formatISOTime(appt.endsAt)}`} />
        <FieldRow label="Cadastrado" value={formatCreatedAt(appt.createdAt)} />
      </DetailCard>

      {/* Cancellation reason */}
      {(appt.status === 'cancelled_by_client' || appt.status === 'cancelled_by_professional') && appt.cancellationReason && (
        <DetailCard>
          <p className="text-sm font-bold text-foreground pt-5 pb-1">Cancelamento</p>
          <FieldRow label="Motivo" value={appt.cancellationReason} />
        </DetailCard>
      )}

      {/* Client */}
      <DetailCard>
        <p className="text-sm font-bold text-foreground pt-5 pb-1">Cliente</p>
        <div className="flex items-center justify-between py-3.5">
          <AvatarName name={appt.clientName} avatarUrl={appt.clientAvatarUrl} />
          <Link
            href={`/clients/${appt.clientId}`}
            className="text-[12.5px] text-indigo-500 hover:text-indigo-600 font-medium transition-colors flex items-center gap-1"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Visualizar
          </Link>
        </div>
      </DetailCard>

      {/* Professional */}
      <DetailCard>
        <p className="text-sm font-bold text-foreground pt-5 pb-1">Profissional</p>
        <div className="flex items-center justify-between py-3.5">
          <AvatarName name={appt.professionalName} avatarUrl={appt.professionalAvatarUrl} />
          <Link
            href={`/professionals/${appt.professionalId}`}
            className="text-[12.5px] text-indigo-500 hover:text-indigo-600 font-medium transition-colors flex items-center gap-1"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Visualizar
          </Link>
        </div>
      </DetailCard>
    </div>
  )
}
