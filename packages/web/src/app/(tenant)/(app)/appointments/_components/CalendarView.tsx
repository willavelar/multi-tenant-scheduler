'use client'

import { useState, useCallback, useMemo } from 'react'
import type { Appointment } from '@/types'
import { useAppointmentsCalendar } from '@/hooks/useAppointments'
import {
  getWeekDays, getMonthCells,
  formatWeekTitle, formatDayTitle, formatMonthTitle,
  toISODate, isSameDay,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
} from '@/lib/calendarUtils'
import { CalendarWeekGrid } from './CalendarWeekGrid'
import { CalendarDayGrid } from './CalendarDayGrid'
import { CalendarMonthGrid } from './CalendarMonthGrid'
import { AppointmentPopover } from './AppointmentPopover'
import { cn } from '@/lib/utils'

type CalendarMode = 'day' | 'week' | 'month'

type CalendarFilters = {
  serviceId: string
  status: string
  clientId: string
  professionalId: string
}

type Props = { filters: CalendarFilters }

export function CalendarView({ filters }: Props) {
  const [mode, setMode] = useState<CalendarMode>('week')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [popover, setPopover] = useState<{ appointment: Appointment; rect: DOMRect } | null>(null)

  const today = useMemo(() => new Date(), [])

  const { dateFrom, dateTo } = (() => {
    if (mode === 'day') {
      const s = toISODate(currentDate)
      return { dateFrom: s, dateTo: s }
    }
    if (mode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return { dateFrom: toISODate(start), dateTo: toISODate(end) }
    }
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return { dateFrom: toISODate(gridStart), dateTo: toISODate(gridEnd) }
  })()

  const { data: appointments = [], isLoading } = useAppointmentsCalendar(dateFrom, dateTo, {
    serviceId: filters.serviceId || undefined,
    status: filters.status || undefined,
    clientId: filters.clientId || undefined,
    professionalId: filters.professionalId || undefined,
  })

  function navigate(dir: 'prev' | 'next' | 'today') {
    if (dir === 'today') { setCurrentDate(new Date()); return }
    setCurrentDate(prev => {
      if (mode === 'day') return dir === 'prev' ? subDays(prev, 1) : addDays(prev, 1)
      if (mode === 'week') return dir === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
      return dir === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    })
  }

  const handleAppointmentClick = useCallback((appointment: Appointment, rect: DOMRect) => {
    setPopover({ appointment, rect })
  }, [])

  function handleDayClick(date: Date) {
    setCurrentDate(date)
    setMode('day')
  }

  const title = (() => {
    if (mode === 'day') return formatDayTitle(currentDate)
    if (mode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return formatWeekTitle(start, end)
    }
    return formatMonthTitle(currentDate)
  })()

  const weekDays = mode === 'week' ? getWeekDays(currentDate) : []
  const monthCells = mode === 'month' ? getMonthCells(currentDate) : []
  const dayAppts = mode === 'day'
    ? appointments.filter(a => isSameDay(new Date(a.startsAt), currentDate))
    : []

  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm h-[calc(100vh-240px)] min-h-[500px]">
      {/* Calendar nav header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="px-3 py-1.5 bg-indigo-500 text-white text-[12.5px] font-semibold rounded-lg border-none cursor-pointer hover:bg-indigo-600 transition-colors"
            onClick={() => navigate('today')}
          >
            Hoje
          </button>
          <div className="flex gap-0.5">
            <button
              className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-gray-600"
              onClick={() => navigate('prev')}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-gray-600"
              onClick={() => navigate('next')}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <span className="text-[15px] font-bold text-gray-900">{title}</span>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {(['day', 'week', 'month'] as const).map(m => (
            <button
              key={m}
              className={cn(
                'px-3 py-1.5 text-[12.5px] font-semibold rounded-md border-none cursor-pointer transition-colors',
                mode === m ? 'bg-indigo-500 text-white shadow-sm' : 'bg-transparent text-gray-600 hover:bg-white'
              )}
              onClick={() => setMode(m)}
            >
              {m === 'day' ? 'Dia' : m === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid area */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
            <span className="text-sm text-gray-400">Carregando...</span>
          </div>
        )}
        {mode === 'week' && (
          <CalendarWeekGrid
            days={weekDays}
            appointments={appointments}
            today={today}
            onAppointmentClick={handleAppointmentClick}
          />
        )}
        {mode === 'day' && (
          <CalendarDayGrid
            appointments={dayAppts}
            onAppointmentClick={handleAppointmentClick}
          />
        )}
        {mode === 'month' && (
          <CalendarMonthGrid
            cells={monthCells}
            currentMonth={currentDate}
            appointments={appointments}
            today={today}
            onAppointmentClick={handleAppointmentClick}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      {popover && (
        <AppointmentPopover
          appointment={popover.appointment}
          blockRect={popover.rect}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  )
}
