'use client'

import { useEffect, useState } from 'react'
import { DatePickerField } from '@/components/fields/DatePickerField'
import { TimeInputField } from '@/components/fields/TimeInputField'
import { TimeDisplay } from '@/components/data-display/TimeDisplay'
import {
  useExceptions,
  useCreateException,
  useDeleteException,
} from '@/hooks/useWeeklyAvailability'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { ScheduleException } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type LocalException = {
  _key:      string
  date:      string
  allDay:    boolean
  startTime: string
  endTime:   string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const ALL_DAY_START = '00:00:00'
const ALL_DAY_END   = '23:59:00'

function isAllDay(startTime: string, endTime: string) {
  return startTime === ALL_DAY_START && endTime === ALL_DAY_END
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function TimeField({ label, value, onChange, disabled }: {
  label:    string
  value:    string
  onChange: (v: string) => void
  disabled: boolean
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-1">
        {label}
      </label>
      <TimeInputField
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'h-8 w-[110px] px-2 text-[13px] text-foreground bg-background border border-border rounded-md outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
      />
    </div>
  )
}

function ExceptionForm({ onConfirm, onCancel }: {
  onConfirm: (date: string, allDay: boolean, start: string, end: string) => void
  onCancel:  () => void
}) {
  const [date, setDate]     = useState('')
  const [allDay, setAllDay] = useState(false)
  const [start, setStart]   = useState('08:00')
  const [end, setEnd]       = useState('18:00')

  return (
    <div className="border border-border rounded-lg p-3 bg-muted space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-1">
            Data
          </label>
          <DatePickerField
            value={date}
            onChange={setDate}
            min={tomorrow()}
            className="w-[160px]"
            inputClassName="!h-8 text-[13px]"
          />
        </div>
        <TimeField label="Início" value={start} onChange={setStart} disabled={allDay} />
        <TimeField label="Fim"    value={end}   onChange={setEnd}   disabled={allDay} />
        <label className="flex items-center gap-2 cursor-pointer pb-1">
          <input
            type="checkbox"
            checked={allDay}
            onChange={e => setAllDay(e.target.checked)}
            className="w-4 h-4 accent-indigo-500 cursor-pointer"
          />
          <span className="text-[13px] text-foreground">Dia todo</span>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => date && (allDay || (/^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end))) && onConfirm(date, allDay, start, end)}
          disabled={!date || (!allDay && (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)))}
          className="h-7 px-2.5 bg-emerald-500 text-white text-xs font-semibold rounded-md cursor-pointer hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-7 px-2.5 border border-border text-muted-foreground text-xs font-medium rounded-md cursor-pointer hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function ExceptionRow({ date, startTime, endTime, onRemove, disabled }: {
  date:      string
  startTime: string
  endTime:   string
  onRemove?: () => void
  disabled?: boolean
}) {
  const allDayFlag = isAllDay(startTime, endTime)
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
      <div className="flex items-center gap-3 text-[13px] text-foreground">
        <span className="font-medium w-24 shrink-0">{formatDate(date)}</span>
        <span className="text-muted-foreground">–</span>
        {allDayFlag
          ? <span>Dia todo</span>
          : <span><TimeDisplay time={startTime} /> – <TimeDisplay time={endTime} /></span>
        }
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="h-7 px-2.5 text-xs font-medium rounded-md border border-red-200 text-red-500 cursor-pointer hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Remover
        </button>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mt-4 mb-1.5 first:mt-0">
      {children}
    </p>
  )
}

// ── Create mode ───────────────────────────────────────────────────────────────

type CreateProps = {
  mode:     'create'
  value:    LocalException[]
  onChange: (v: LocalException[]) => void
}

function ExceptionsCardCreate({ value, onChange }: Omit<CreateProps, 'mode'>) {
  const [items, setItems]   = useState<LocalException[]>(value)
  const [adding, setAdding] = useState(false)

  useEffect(() => { onChange(items) }, [items, onChange])

  function handleConfirm(date: string, allDay: boolean, start: string, end: string) {
    const startTime = allDay ? ALL_DAY_START : start + ':00'
    const endTime   = allDay ? ALL_DAY_END   : end   + ':00'
    setItems(prev => [...prev, { _key: `${date}-${Date.now()}`, date, allDay, startTime, endTime }])
    setAdding(false)
  }

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm">
      <p className="text-sm font-bold text-foreground m-0 mb-4">Dias e Horários (Não Disponível)</p>

      {sorted.length > 0 && (
        <div className="mb-3">
          {sorted.map(item => (
            <ExceptionRow
              key={item._key}
              date={item.date}
              startTime={item.startTime}
              endTime={item.endTime}
              onRemove={() => setItems(prev => prev.filter(i => i._key !== item._key))}
            />
          ))}
        </div>
      )}

      {adding ? (
        <ExceptionForm
          onConfirm={handleConfirm}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="h-8 px-3 border border-dashed border-border text-muted-foreground text-[13px] rounded-lg cursor-pointer hover:border-indigo-400 hover:text-indigo-500 transition-colors"
        >
          + Adicionar Data e Horário
        </button>
      )}
    </div>
  )
}

// ── Edit mode ─────────────────────────────────────────────────────────────────

type EditProps = {
  mode:           'edit'
  professionalId: string
}

function ExceptionsCardEdit({ professionalId }: Omit<EditProps, 'mode'>) {
  const { data: exceptions = [], isLoading } = useExceptions(professionalId)
  const createEx = useCreateException()
  const deleteEx = useDeleteException()
  const [adding, setAdding] = useState(false)
  const [busy, setBusy]     = useState(false)

  const todayStr = today()
  const future   = exceptions.filter(e => e.date >  todayStr).sort((a, b) => a.date.localeCompare(b.date))
  const past     = exceptions.filter(e => e.date <= todayStr).sort((a, b) => b.date.localeCompare(a.date))

  async function handleConfirm(date: string, allDay: boolean, start: string, end: string) {
    setBusy(true)
    try {
      await createEx.mutateAsync({
        professionalId,
        date,
        type:      'block',
        startTime: allDay ? ALL_DAY_START : start + ':00',
        endTime:   allDay ? ALL_DAY_END   : end   + ':00',
      })
      setAdding(false)
    } finally { setBusy(false) }
  }

  async function handleRemove(ex: ScheduleException) {
    setBusy(true)
    try { await deleteEx.mutateAsync(ex.id) }
    finally { setBusy(false) }
  }

  return (
    <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm">
      <p className="text-sm font-bold text-foreground m-0 mb-4">Dias e Horários (Não Disponível)</p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {future.length > 0 && (
            <>
              <SectionLabel>Datas futuras</SectionLabel>
              {future.map(ex => (
                <ExceptionRow
                  key={ex.id}
                  date={ex.date}
                  startTime={ex.startTime}
                  endTime={ex.endTime}
                  onRemove={() => handleRemove(ex)}
                  disabled={busy}
                />
              ))}
            </>
          )}

          {past.length > 0 && (
            <>
              <SectionLabel>Datas anteriores</SectionLabel>
              {past.map(ex => (
                <ExceptionRow
                  key={ex.id}
                  date={ex.date}
                  startTime={ex.startTime}
                  endTime={ex.endTime}
                />
              ))}
            </>
          )}

          {!future.length && !past.length && !adding && (
            <p className="text-[13px] text-muted-foreground italic mb-3">Nenhuma data bloqueada.</p>
          )}
        </>
      )}

      {adding ? (
        <ExceptionForm
          onConfirm={handleConfirm}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={busy}
          className="mt-3 h-8 px-3 border border-dashed border-border text-muted-foreground text-[13px] rounded-lg cursor-pointer hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + Adicionar Data e Horário
        </button>
      )}
    </div>
  )
}

// ── View mode (read-only, future dates only) ──────────────────────────────────

type ViewProps = {
  mode:           'view'
  professionalId: string
}

function ExceptionsCardView({ professionalId }: Omit<ViewProps, 'mode'>) {
  const { data: exceptions = [], isLoading } = useExceptions(professionalId)
  const future = exceptions
    .filter(e => e.date > today())
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm">
      <p className="text-sm font-bold text-foreground m-0 mb-4">Dias e Horários (Não Disponível)</p>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : future.length === 0 ? (
        <p className="text-[13px] text-muted-foreground italic m-0">Nenhuma data bloqueada futura.</p>
      ) : (
        future.map(ex => (
          <ExceptionRow
            key={ex.id}
            date={ex.date}
            startTime={ex.startTime}
            endTime={ex.endTime}
          />
        ))
      )}
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export type ExceptionsCardProps = CreateProps | EditProps | ViewProps

export function ExceptionsCard(props: ExceptionsCardProps) {
  if (props.mode === 'create') {
    return <ExceptionsCardCreate value={props.value} onChange={props.onChange} />
  }
  if (props.mode === 'view') {
    return <ExceptionsCardView professionalId={props.professionalId} />
  }
  return <ExceptionsCardEdit professionalId={props.professionalId} />
}
