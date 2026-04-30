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

// Timestamps are interpreted as local time — the API returns datetimes in the tenant's local timezone.
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

  // Pre-compute timestamps once to avoid repeated date parsing.
  const times = sorted.map(a => ({
    appointment: a,
    startMs: new Date(a.startsAt).getTime(),
    endMs: new Date(a.endsAt).getTime(),
  }))

  // Greedy interval graph coloring: assign each appointment to the first column
  // whose previous occupant has ended.
  const colEnds: number[] = []
  const assigned: { appointment: Appointment; colIdx: number; startMs: number; endMs: number }[] = []

  for (const { appointment, startMs, endMs } of times) {
    let placed = false
    for (let c = 0; c < colEnds.length; c++) {
      if (startMs >= colEnds[c]) {
        colEnds[c] = endMs
        assigned.push({ appointment, colIdx: c, startMs, endMs })
        placed = true
        break
      }
    }
    if (!placed) {
      colEnds.push(endMs)
      assigned.push({ appointment, colIdx: colEnds.length - 1, startMs, endMs })
    }
  }

  // Union-Find to group overlapping appointments into connected components.
  // Without this, two sequential clusters that reuse the same column indices
  // would compute different columnCounts, causing inconsistent block widths.
  const parent = assigned.map((_, i) => i)
  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x])
    return parent[x]
  }
  for (let i = 0; i < assigned.length; i++) {
    for (let j = i + 1; j < assigned.length; j++) {
      if (assigned[i].startMs < assigned[j].endMs && assigned[i].endMs > assigned[j].startMs) {
        parent[find(i)] = find(j)
      }
    }
  }

  // Each group's columnCount = max(colIdx) + 1 across all members.
  const groupMaxCol = new Map<number, number>()
  for (let i = 0; i < assigned.length; i++) {
    const root = find(i)
    groupMaxCol.set(root, Math.max(groupMaxCol.get(root) ?? 0, assigned[i].colIdx))
  }

  return assigned.map(({ appointment, colIdx }, i) => ({
    appointment,
    columnIndex: colIdx,
    columnCount: (groupMaxCol.get(find(i)) ?? colIdx) + 1,
  }))
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
  const sMonth = start.toLocaleDateString('pt-BR', { month: 'short' })
  const eMonth = end.toLocaleDateString('pt-BR', { month: 'short' })
  const sYear = start.getFullYear()
  const eYear = end.getFullYear()
  return sYear === eYear
    ? `${sMonth} – ${eMonth} ${eYear}`
    : `${sMonth} ${sYear} – ${eMonth} ${eYear}`
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
