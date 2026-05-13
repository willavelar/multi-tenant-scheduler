'use client'

import { useRef, useEffect } from 'react'
import type { Appointment } from '@/types'
import { HOUR_HEIGHT, TOTAL_HOURS, isSameDay, layoutAppointments, blockPosition, weekdayShort } from '@/lib/calendarUtils'
import { CalendarEventBlock } from './CalendarEventBlock'
import { cn } from '@/lib/utils'
import { useFormatTime } from '@/hooks/useFormatTime'

type Props = {
  days: Date[]
  appointments: Appointment[]
  today: Date
  onAppointmentClick: (appointment: Appointment, rect: DOMRect) => void
}

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i)
const LABEL_WIDTH = 52

export function CalendarWeekGrid({ days, appointments, today, onAppointmentClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { formatHour } = useFormatTime()
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day header row */}
      <div className="flex flex-shrink-0 border-b border-border" style={{ paddingLeft: LABEL_WIDTH }}>
        {days.map(day => {
          const isToday = isSameDay(day, today)
          return (
            <div key={day.toISOString()} className="flex-1 text-center py-2 px-1 border-l border-border first:border-l-0">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{weekdayShort(day)}</div>
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center mx-auto mt-0.5 text-sm font-semibold',
                isToday ? 'bg-indigo-500 text-white' : 'text-foreground'
              )}>{day.getDate()}</div>
            </div>
          )
        })}
      </div>

      {/* Scrollable area */}
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

          {/* Day columns */}
          {days.map(day => {
            const dayAppts = appointments.filter(a => isSameDay(new Date(a.startsAt), day))
            const layout = layoutAppointments(dayAppts)
            return (
              <div key={day.toISOString()} className="flex-1 border-l border-border relative first:border-l-0">
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
