'use client'

import { useFormatTime } from '@/hooks/useFormatTime'

export function TimeDisplay({ time }: { time: string }) {
  const { formatTime } = useFormatTime()
  return <span>{formatTime(time)}</span>
}
