'use client'

import { useUserPreferences } from '@/providers/UserPreferencesProvider'
import { formatTime } from '@/lib/time'

export function TimeDisplay({ time }: { time: string }) {
  const { timeFormat } = useUserPreferences()
  return <span>{formatTime(time, timeFormat)}</span>
}
