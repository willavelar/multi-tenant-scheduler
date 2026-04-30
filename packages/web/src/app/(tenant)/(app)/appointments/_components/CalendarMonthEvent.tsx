'use client'

import type { Appointment } from '@/types'
import { useFormatTime } from '@/hooks/useFormatTime'

type Props = {
  appointment: Appointment
  color: string
  onClick: (rect: DOMRect) => void
}

export function CalendarMonthEvent({ appointment, color, onClick }: Props) {
  const { formatISOTime } = useFormatTime()

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    onClick((e.currentTarget as HTMLElement).getBoundingClientRect())
  }

  return (
    <button
      className="w-full flex items-center gap-1 rounded px-1 py-0.5 mb-0.5 text-left overflow-hidden cursor-pointer hover:brightness-90 transition-all border-none"
      style={{ background: color }}
      onClick={handleClick}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
      <span className="text-white text-[10px] font-medium truncate">
        {formatISOTime(appointment.startsAt)} {appointment.clientName}
      </span>
    </button>
  )
}
