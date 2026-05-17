'use client'

import { useRef } from 'react'

type Props = {
  value:      string
  onChange:   (v: string) => void
  disabled?:  boolean
  className?: string
}

function rawDigits(v: string) {
  return v.replace(/\D/g, '')
}

function toDisplay(raw: string): string {
  if (raw.length <= 2) return raw
  return `${raw.slice(0, 2)}:${raw.slice(2, 4)}`
}

export function TimeInputField({ value, onChange, disabled, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const key = e.key

    if (['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return

    e.preventDefault()

    if (key === 'Backspace' || key === 'Delete') {
      const raw = rawDigits(value)
      onChange(toDisplay(raw.slice(0, -1)))
      return
    }

    if (!/^\d$/.test(key)) return

    const raw = rawDigits(value)
    if (raw.length >= 4) return

    const idx = raw.length

    // Hour tens: 0-2
    if (idx === 0 && parseInt(key) > 2) return
    // Hour units: if tens is 2, max is 3
    if (idx === 1 && parseInt(raw[0]) === 2 && parseInt(key) > 3) return
    // Minute tens: 0-5
    if (idx === 2 && parseInt(key) > 5) return

    onChange(toDisplay(raw + key))
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={value}
      placeholder="HH:MM"
      onKeyDown={handleKeyDown}
      onChange={() => {}}
      disabled={disabled}
      className={className}
    />
  )
}
