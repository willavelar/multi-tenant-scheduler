'use client'

import type { Appointment } from '@/types'
import { formatISOTime } from '@/lib/calendarUtils'

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
  const widthPct = 100 / columnCount
  const leftPct = (columnIndex * 100) / columnCount

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    onClick((e.currentTarget as HTMLElement).getBoundingClientRect())
  }

  return (
    <div
      className="absolute rounded-md cursor-pointer overflow-hidden select-none px-1.5 py-0.5 hover:brightness-90 transition-all z-10"
      style={{
        top: top + 1,
        height: height - 2,
        left: `calc(${leftPct}% + 1px)`,
        width: `calc(${widthPct}% - 2px)`,
        background: color,
      }}
      onClick={handleClick}
    >
      <p className="text-white text-[11px] font-semibold truncate leading-tight m-0">
        {appointment.clientName}
      </p>
      {height >= 32 && (
        <p className="text-white/85 text-[10px] truncate leading-tight m-0">
          {appointment.serviceName}
        </p>
      )}
      {height >= 32 && (
        <p className="text-white/75 text-[10px] leading-tight m-0">
          {formatISOTime(appointment.startsAt)} – {formatISOTime(appointment.endsAt)}
        </p>
      )}
    </div>
  )
}
