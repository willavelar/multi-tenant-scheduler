'use client'

import type { Appointment } from '@/types'
import { useFormatTime } from '@/hooks/useFormatTime'
import { cn } from '@/lib/utils'

type Props = {
  appointment: Appointment
  color: string
  onClick: (rect: DOMRect) => void
}

export function CalendarMonthEvent({ appointment, color, onClick }: Props) {
  const { formatISOTime } = useFormatTime()

  const isPast = new Date(appointment.endsAt) < new Date()
  const isCancelled = appointment.status === 'cancelled'

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    onClick((e.currentTarget as HTMLElement).getBoundingClientRect())
  }

  return (
    <button
      className={cn(
        'w-full flex items-center gap-1 rounded px-1 py-0.5 mb-0.5 text-left overflow-hidden cursor-pointer hover:brightness-90 transition-all border-none',
        isPast && 'opacity-60',
      )}
      style={{
        background: isCancelled ? 'white' : color,
        ...(isCancelled && { border: `1.5px solid ${color}` }),
      }}
      onClick={handleClick}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: isCancelled ? color : 'rgba(255,255,255,0.7)' }}
      />
      <span
        className={cn(
          'text-[10px] font-medium truncate',
          !isCancelled && (isPast ? 'text-gray-700' : 'text-white'),
        )}
        style={isCancelled ? { color } : undefined}
      >
        {formatISOTime(appointment.startsAt)} {appointment.clientName}
      </span>
    </button>
  )
}
