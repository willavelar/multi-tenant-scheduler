import { startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns'
import type { Appointment } from '@/types'

export const HOUR_HEIGHT = 64   // px per hour
export const SLOT_HEIGHT = 16   // px per 15 min — minimum block height
export const TOTAL_HOURS = 24

export type LayoutItem = {
  appointment: Appointment
  columnIndex: number
  columnCount: number
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 })
  const end = endOfWeek(anchor, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export function getMonthCells(anchor: Date): Date[] {
  const monthStart = startOfMonth(anchor)
  const monthEnd = endOfMonth(anchor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

export function blockPosition(startsAt: string, endsAt: string): { top: number; height: number } {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const startMins = start.getHours() * 60 + start.getMinutes()
  const durMins = Math.round((end.getTime() - start.getTime()) / 60000)
  return {
    top: (startMins / 60) * HOUR_HEIGHT,
    height: Math.max(SLOT_HEIGHT, (durMins / 60) * HOUR_HEIGHT),
  }
}

export function layoutAppointments(appts: Appointment[]): LayoutItem[] {
  if (!appts.length) return []
  const sorted = [...appts].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  )
  const colEnds: string[] = []
  const assigned: { appointment: Appointment; colIdx: number }[] = []

  for (const appt of sorted) {
    const start = new Date(appt.startsAt).getTime()
    let placed = false
    for (let c = 0; c < colEnds.length; c++) {
      if (start >= new Date(colEnds[c]).getTime()) {
        colEnds[c] = appt.endsAt
        assigned.push({ appointment: appt, colIdx: c })
        placed = true
        break
      }
    }
    if (!placed) {
      colEnds.push(appt.endsAt)
      assigned.push({ appointment: appt, colIdx: colEnds.length - 1 })
    }
  }

  return assigned.map(({ appointment, colIdx }) => {
    const aStart = new Date(appointment.startsAt).getTime()
    const aEnd = new Date(appointment.endsAt).getTime()
    const maxCol = assigned
      .filter(({ appointment: other }) => {
        const oStart = new Date(other.startsAt).getTime()
        const oEnd = new Date(other.endsAt).getTime()
        return aStart < oEnd && aEnd > oStart
      })
      .reduce((m, { colIdx: c }) => Math.max(m, c), colIdx)
    return { appointment, columnIndex: colIdx, columnCount: maxCol + 1 }
  })
}

export function formatISOTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

const WEEKDAY_SHORT = ['DOM.', 'SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.']
export function weekdayShort(date: Date): string {
  return WEEKDAY_SHORT[date.getDay()]
}

export function formatWeekTitle(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const s = start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  const s = start.toLocaleDateString('pt-BR', { month: 'short' })
  const eMonth = end.toLocaleDateString('pt-BR', { month: 'short' })
  return `${s} – ${eMonth} ${end.getFullYear()}`
}

export function formatDayTitle(date: Date): string {
  const s = date.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatMonthTitle(date: Date): string {
  const s = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth }
