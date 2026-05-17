export const SYSTEM_TIMEZONE = 'America/Sao_Paulo'

export function formatTime(time: string): string {
  return time.slice(0, 5) // HH:mm, always 24h
}

export function formatISOTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function formatHour(h: number): string {
  if (h === 0) return ''
  return `${String(h).padStart(2, '0')}:00`
}
