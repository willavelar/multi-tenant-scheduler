export const CALENDAR_COLORS = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6',
  '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
  '#84cc16', '#a855f7', '#22c55e', '#eab308', '#0ea5e9',
  '#f43f5e', '#64748b', '#d946ef', '#2dd4bf', '#fb923c',
]

export function pickDistinctColor(usedColors: string[]): string {
  const unused = CALENDAR_COLORS.find(c => !usedColors.includes(c))
  if (unused) return unused
  const counts = new Map(CALENDAR_COLORS.map(c => [c, 0]))
  for (const c of usedColors) if (counts.has(c)) counts.set(c, counts.get(c)! + 1)
  let min = Infinity, pick = CALENDAR_COLORS[0]
  for (const [c, n] of counts) { if (n < min) { min = n; pick = c } }
  return pick
}
