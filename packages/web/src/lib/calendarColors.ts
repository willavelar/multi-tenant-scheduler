export const CALENDAR_COLORS = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6',
  '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
  '#84cc16', '#a855f7', '#22c55e', '#eab308', '#0ea5e9',
  '#f43f5e', '#64748b', '#d946ef', '#2dd4bf', '#fb923c',
]

export function clientColor(clientId: string): string {
  let hash = 0
  for (const ch of clientId) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return CALENDAR_COLORS[Math.abs(hash) % CALENDAR_COLORS.length]
}
