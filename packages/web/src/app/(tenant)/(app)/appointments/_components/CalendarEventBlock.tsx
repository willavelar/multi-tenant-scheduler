'use client'

import type { Appointment } from '@/types'
import { useFormatTime } from '@/hooks/useFormatTime'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending: 'Pendente', confirmed: 'Confirmado', cancelled: 'Cancelado', completed: 'Pago',
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
  const isCancelled = appointment.status === 'cancelled'

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    onClick((e.currentTarget as HTMLElement).getBoundingClientRect())
  }

  return (
    <div
      className={cn(
        'absolute rounded-md cursor-pointer overflow-hidden select-none px-1.5 py-0.5 hover:brightness-90 transition-all z-10',
        isPast && 'opacity-60',
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
          'text-[11px] font-semibold truncate leading-tight m-0',
          !isCancelled && (isPast ? 'text-gray-700' : 'text-white'),
        )}
        style={isCancelled ? { color } : undefined}
      >
        {appointment.clientName}
      </p>
      {height >= 32 && (
        <>
          <p
            className={cn(
              'text-[10px] truncate leading-tight m-0',
              !isCancelled && (isPast ? 'text-gray-500' : 'text-white/85'),
            )}
            style={isCancelled ? { color, opacity: 0.8 } : undefined}
          >
            {appointment.serviceName} ({STATUS_LABELS[appointment.status]})
          </p>
          <p
            className={cn(
              'text-[10px] leading-tight m-0',
              !isCancelled && (isPast ? 'text-gray-400' : 'text-white/75'),
            )}
            style={isCancelled ? { color, opacity: 0.7 } : undefined}
          >
            {formatISOTime(appointment.startsAt)} – {formatISOTime(appointment.endsAt)}
          </p>
        </>
      )}
    </div>
  )
}
