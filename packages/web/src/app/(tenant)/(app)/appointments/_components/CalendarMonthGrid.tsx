'use client'

import type { Appointment } from '@/types'
import { isSameDay } from '@/lib/calendarUtils'
import { clientColor } from '@/lib/calendarColors'
import { CalendarMonthEvent } from './CalendarMonthEvent'
import { cn } from '@/lib/utils'

type Props = {
  cells: Date[]
  currentMonth: Date
  appointments: Appointment[]
  today: Date
  onAppointmentClick: (appointment: Appointment, rect: DOMRect) => void
  onDayClick: (date: Date) => void
}

const WEEKDAY_HEADERS = ['SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.', 'DOM.']
const MAX_VISIBLE = 3

export function CalendarMonthGrid({ cells, currentMonth, appointments, today, onAppointmentClick, onDayClick }: Props) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
        {WEEKDAY_HEADERS.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-r border-border last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7">
          {cells.map(cell => {
            const isToday = isSameDay(cell, today)
            const isCurrentMonth = cell.getMonth() === currentMonth.getMonth() &&
              cell.getFullYear() === currentMonth.getFullYear()
            const dayAppts = appointments
              .filter(a => isSameDay(new Date(a.startsAt), cell))
              .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
            const visible = dayAppts.slice(0, MAX_VISIBLE)
            const overflow = dayAppts.length - MAX_VISIBLE

            return (
              <div
                key={cell.toISOString()}
                className={cn(
                  'border-r border-b border-border last:border-r-0 min-h-[110px] p-1.5',
                  !isCurrentMonth && 'bg-muted/60'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold mb-1 cursor-pointer',
                    isToday
                      ? 'bg-indigo-500 text-white'
                      : isCurrentMonth ? 'text-foreground hover:bg-accent' : 'text-muted-foreground'
                  )}
                  onClick={() => onDayClick(cell)}
                >
                  {cell.getDate()}
                </div>
                {visible.map(appt => (
                  <CalendarMonthEvent
                    key={appt.id}
                    appointment={appt}
                    color={clientColor(appt.clientId)}
                    onClick={rect => onAppointmentClick(appt, rect)}
                  />
                ))}
                {overflow > 0 && (
                  <button
                    className="text-[10px] text-indigo-600 font-semibold pl-1 hover:underline cursor-pointer border-none bg-transparent p-0"
                    onClick={() => onDayClick(cell)}
                  >
                    + {overflow} mais
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
