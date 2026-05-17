'use client'

import { formatTime, formatISOTime, formatHour } from '@/lib/time'

export function useFormatTime() {
  return { formatTime, formatISOTime, formatHour }
}
