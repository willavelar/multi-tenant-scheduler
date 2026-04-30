'use client'

import { useUserPreferences } from '@/providers/UserPreferencesProvider'
import { formatTime, formatISOTime, formatHour } from '@/lib/time'

export function useFormatTime() {
  const { timeFormat } = useUserPreferences()
  return {
    formatTime:    (time: string) => formatTime(time, timeFormat),
    formatISOTime: (iso: string)  => formatISOTime(iso, timeFormat),
    formatHour:    (h: number)    => formatHour(h, timeFormat),
    timeFormat,
  }
}
