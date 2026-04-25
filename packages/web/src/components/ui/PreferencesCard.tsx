'use client'

import { cn } from '@/lib/utils'
import { TIMEZONES } from '@/lib/time'

type Props = {
  timezone:           string
  timeFormat:         '12h' | '24h'
  onTimezoneChange:   (v: string) => void
  onTimeFormatChange: (v: '12h' | '24h') => void
}

const inputCls = cn(
  'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none transition-colors',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
)

export function PreferencesCard({ timezone, timeFormat, onTimezoneChange, onTimeFormatChange }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
      <p className="text-sm font-bold text-gray-900 m-0 mb-5">Preferências</p>

      <div className="mb-4">
        <label htmlFor="pref-timezone" className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Fuso horário
        </label>
        <div className="relative max-w-[420px]">
          <select
            id="pref-timezone"
            value={timezone}
            onChange={e => onTimezoneChange(e.target.value)}
            className={cn(inputCls, 'appearance-none cursor-pointer')}
          >
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500"
            width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-medium text-gray-700 mb-2">Formato de horário</p>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="radio"
              name="timeFormat"
              value="24h"
              checked={timeFormat === '24h'}
              onChange={() => onTimeFormatChange('24h')}
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
            <span className="text-[13.5px] text-gray-700">Formato de 24 horas <span className="text-gray-400">(Ex: 18:00)</span></span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="radio"
              name="timeFormat"
              value="12h"
              checked={timeFormat === '12h'}
              onChange={() => onTimeFormatChange('12h')}
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
            <span className="text-[13.5px] text-gray-700">Formato de 12 horas <span className="text-gray-400">(Ex: 6:00 PM)</span></span>
          </label>
        </div>
      </div>
    </div>
  )
}
