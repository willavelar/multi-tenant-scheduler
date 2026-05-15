'use client'

import type { Appointment } from '@/types'
import { useFormatTime } from '@/hooks/useFormatTime'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending:                   'Pendente',
  confirmed:                 'Confirmado',
  cancelled_by_client:       'Cancelado pelo cliente',
  cancelled_by_professional: 'Cancelado pelo profissional',
  completed:                 'Pago',
}

type Props = {
  appointment: Appointment
  color: string
  top: number
  height: number
  columnIndex: number
  columnCount: number
  onClick: (rect: DOMRect) => void
}

export function CalendarEventBlock({ appointment, color, top, height, columnIndex, columnCount, onClick }: Props) {
  const { formatISOTime } = useFormatTime()
  const widthPct = 100 / columnCount
  const leftPct = (columnIndex * 100) / columnCount

  const isPast = new Date(appointment.endsAt) < new Date()
  const isCancelled = appointment.status === 'cancelled_by_client' || appointment.status === 'cancelled_by_professional'

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    onClick((e.currentTarget as HTMLElement).getBoundingClientRect())
  }

  return (
    <div
      className={cn(
        'absolute rounded-md cursor-pointer overflow-hidden select-none px-1.5 py-0.5 z-10',
        isPast && 'opacity-80',
      )}
      style={{
        top: top + 1,
        height: height - 2,
        left: `calc(${leftPct}% + 1px)`,
        width: `calc(${widthPct}% - 2px)`,
        background: isCancelled ? 'white' : color,
        ...(isCancelled && { border: `1.5px solid ${color}` }),
      }}
      onClick={handleClick}
    >
      <p
        className={cn(
          'text-[12px] font-semibold truncate leading-tight m-0',
          !isCancelled && (isPast ? 'text-white/80' : 'text-white'),
        )}
        style={isCancelled ? { color } : undefined}
      >
        {appointment.clientName}
      </p>
      {height >= 32 && (
        <>
          <p
            className={cn(
              'text-[11px] truncate leading-tight m-0',
              !isCancelled && (isPast ? 'text-white/70' : 'text-white/85'),
            )}
            style={isCancelled ? { color, opacity: 0.9 } : undefined}
          >
            {appointment.serviceName} ({STATUS_LABELS[appointment.status]})
          </p>
          <p
            className={cn(
              'text-[11px] leading-tight m-0',
              !isCancelled && (isPast ? 'text-white/70' : 'text-white/85'),
            )}
            style={isCancelled ? { color, opacity: 0.9 } : undefined}
          >
            {formatISOTime(appointment.startsAt)} – {formatISOTime(appointment.endsAt)}
          </p>
        </>
      )}
    </div>
  )
}
