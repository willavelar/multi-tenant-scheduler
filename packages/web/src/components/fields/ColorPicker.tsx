'use client'

import { useRef } from 'react'
import { CALENDAR_COLORS } from '@/lib/calendarColors'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (color: string) => void
  label?: string
  required?: boolean
}

export function ColorPicker({ value, onChange, label, required }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isPreset = CALENDAR_COLORS.includes(value.toLowerCase()) ||
    CALENDAR_COLORS.includes(value.toUpperCase()) ||
    CALENDAR_COLORS.includes(value)
  const isCustom = !isPreset

  return (
    <div>
      {label && (
        <label className="block text-[13px] font-medium text-foreground mb-1.5">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      {/* Swatch grid */}
      <div className="flex flex-wrap gap-2 mb-3">
        {CALENDAR_COLORS.map(color => (
          <button
            key={color}
            type="button"
            title={color}
            onClick={() => onChange(color)}
            className={cn(
              'w-7 h-7 rounded-full border-2 transition-all duration-150 cursor-pointer shrink-0',
              value === color
                ? 'border-foreground scale-110 shadow-md ring-2 ring-background ring-offset-1'
                : 'border-transparent hover:scale-110 hover:shadow-sm',
            )}
            style={{ background: color }}
          />
        ))}

        {/* Custom colour trigger */}
        <button
          type="button"
          title="Cor personalizada"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-7 h-7 rounded-full border-2 transition-all duration-150 cursor-pointer shrink-0 flex items-center justify-center',
            isCustom
              ? 'border-foreground scale-110 shadow-md ring-2 ring-background ring-offset-1'
              : 'border-dashed border-muted-foreground hover:scale-110 hover:border-foreground bg-background',
          )}
          style={isCustom ? { background: value } : undefined}
        >
          {!isCustom && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          )}
        </button>

        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="sr-only"
          aria-label="Selecionar cor personalizada"
        />
      </div>

      {/* Preview pill */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg border border-black/10 shadow-sm shrink-0"
          style={{ background: value }}
        />
        <span className="text-[13px] font-mono text-muted-foreground tracking-wide">
          {value.toUpperCase()}
        </span>
      </div>
    </div>
  )
}
