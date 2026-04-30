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
  // Chromium-only hint: pt-BR forces 24h display, en-US forces AM/PM.
  // Firefox/Safari ignore lang and use OS locale. Value is always HH:mm.
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
