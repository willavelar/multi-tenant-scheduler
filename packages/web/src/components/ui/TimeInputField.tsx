'use client'

import { useFormatTime } from '@/hooks/useFormatTime'

type Props = {
  value:     string
  onChange:  (v: string) => void
  disabled?: boolean
  className?: string
}

export function TimeInputField({ value, onChange, disabled, className }: Props) {
  const { timeFormat } = useFormatTime()
  const lang = timeFormat === '24h' ? 'pt-BR' : 'en-US'
  return (
    <input
      type="time"
      lang={lang}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={className}
    />
  )
}
