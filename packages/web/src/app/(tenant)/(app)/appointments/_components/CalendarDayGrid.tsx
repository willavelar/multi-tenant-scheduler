'use client'

import { useRef, useEffect } from 'react'
import type { Appointment } from '@/types'
import { HOUR_HEIGHT, TOTAL_HOURS, layoutAppointments, blockPosition } from '@/lib/calendarUtils'
import { CalendarEventBlock } from './CalendarEventBlock'
import { useFormatTime } from '@/hooks/useFormatTime'

type Props = {
  appointments: Appointment[]
  onAppointmentClick: (appointment: Appointment, rect: DOMRect) => void
}

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i)
const LABEL_WIDTH = 52

export function CalendarDayGrid({ appointments, onAppointmentClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT }, [])
  const { formatHour } = useFormatTime()

  const layout = layoutAppointments(appointments)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          {/* Time labels */}
          <div className="relative flex-shrink-0 border-r border-border" style={{ width: LABEL_WIDTH }}>
            {HOURS.map(h => (
              <div key={h} className="absolute right-2 text-[10px] text-muted-foreground select-none" style={{ top: h * HOUR_HEIGHT - 7 }}>
                {formatHour(h)}
              </div>
            ))}
          </div>
          {/* Single column */}
          <div className="flex-1 border-l border-border relative">
            {HOURS.map(h => (
              <div key={h} className="absolute w-full" style={{ top: h * HOUR_HEIGHT }}>
                <div className="border-t border-border w-full" />
                <div className="border-t border-dashed border-border w-full" style={{ marginTop: HOUR_HEIGHT / 2 }} />
              </div>
            ))}
            {layout.map(({ appointment, columnIndex, columnCount }) => {
              const { top, height } = blockPosition(appointment.startsAt, appointment.endsAt)
              return (
                <CalendarEventBlock
                  key={appointment.id}
                  appointment={appointment}
                  color={appointment.serviceColor}
                  top={top} height={height}
                  columnIndex={columnIndex} columnCount={columnCount}
                  onClick={rect => onAppointmentClick(appointment, rect)}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
