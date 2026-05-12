'use client'

import { useState, useRef, useEffect } from 'react'
import { ptBR } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function toIso(masked: string): string {
  const m = masked.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return ''
  const [, d, mo, y] = m
  const date = new Date(`${y}-${mo}-${d}`)
  if (isNaN(date.getTime())) return ''
  return `${y}-${mo}-${d}`
}

function toBrMask(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ''
  return `${m[3]}/${m[2]}/${m[1]}`
}

interface DatePickerFieldProps {
  value: string // ISO yyyy-mm-dd or ''
  onChange: (iso: string) => void
  min?: Date
  max?: Date
  placeholder?: string
  className?: string
  inputClassName?: string
}

export function DatePickerField({
  value,
  onChange,
  min,
  max,
  placeholder = 'dd/mm/aaaa',
  className,
  inputClassName,
}: DatePickerFieldProps) {
  const [display, setDisplay] = useState(() => toBrMask(value))
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDisplay(toBrMask(value))
  }, [value])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleInput(raw: string) {
    const masked = applyDateMask(raw)
    setDisplay(masked)
    onChange(toIso(masked))
  }

  function handleCalendarSelect(date: Date | undefined) {
    if (!date) return
    const y = date.getFullYear()
    const mo = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    onChange(`${y}-${mo}-${d}`)
    setDisplay(`${d}/${mo}/${y}`)
    setOpen(false)
  }

  const selectedDate = value ? new Date(value + 'T00:00:00') : undefined

  const disabled = [
    ...(min ? [{ before: min }] : []),
    ...(max ? [{ after: max }] : []),
  ]

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div className="relative">
        <input
          type="text"
          value={display}
          onChange={e => handleInput(e.target.value)}
          placeholder={placeholder}
          maxLength={10}
          className={cn(
            'w-full h-[42px] pl-3 pr-10 text-sm text-foreground bg-background rounded-lg border border-border outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
            inputClassName
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen(o => !o)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground bg-transparent border-0 cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-popover border border-border rounded-xl shadow-lg animate-in fade-in slide-in-from-top-1.5 duration-150">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            defaultMonth={selectedDate}
            disabled={disabled.length ? disabled : undefined}
            locale={ptBR}
          />
        </div>
      )}
    </div>
  )
}
