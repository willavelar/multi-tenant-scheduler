'use client'

import { useRef, useEffect } from 'react'
import type { Appointment } from '@/types'
import { HOUR_HEIGHT, TOTAL_HOURS, layoutAppointments, blockPosition } from '@/lib/calendarUtils'
import { clientColor } from '@/lib/calendarColors'
import { CalendarEventBlock } from './CalendarEventBlock'

type Props = {
  appointments: Appointment[]
  onAppointmentClick: (appointment: Appointment, rect: DOMRect) => void
}

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i)
const LABEL_WIDTH = 52

export function CalendarDayGrid({ appointments, onAppointmentClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT }, [])

  const layout = layoutAppointments(appointments)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          {/* Time labels */}
          <div className="relative flex-shrink-0 border-r border-gray-200" style={{ width: LABEL_WIDTH }}>
            {HOURS.map(h => (
              <div key={h} className="absolute right-2 text-[10px] text-gray-400 select-none" style={{ top: h * HOUR_HEIGHT - 7 }}>
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>
          {/* Single column */}
          <div className="flex-1 border-l border-gray-200 relative">
            {HOURS.map(h => (
              <div key={h} className="absolute w-full" style={{ top: h * HOUR_HEIGHT }}>
                <div className="border-t border-gray-200 w-full" />
                <div className="border-t border-dashed border-gray-100 w-full" style={{ marginTop: HOUR_HEIGHT / 2 }} />
              </div>
            ))}
            {layout.map(({ appointment, columnIndex, columnCount }) => {
              const { top, height } = blockPosition(appointment.startsAt, appointment.endsAt)
              return (
                <CalendarEventBlock
                  key={appointment.id}
                  appointment={appointment}
                  color={clientColor(appointment.clientId)}
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
