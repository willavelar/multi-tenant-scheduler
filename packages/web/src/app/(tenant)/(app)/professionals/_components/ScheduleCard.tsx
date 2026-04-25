'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  useWeeklyAvailability,
  useCreateWeeklyAvailability,
  useDeleteWeeklyAvailability,
} from '@/hooks/useWeeklyAvailability'
import { TimeDisplay } from '@/components/ui/TimeDisplay'
import type { WeeklyAvailability } from '@/types'

// ── Constants ─────────────────────────────────────────────────────────────────

export const DAYS = [
  { label: 'Seg.', value: 1 },
  { label: 'Ter.', value: 2 },
  { label: 'Qua.', value: 3 },
  { label: 'Qui.', value: 4 },
  { label: 'Sex.', value: 5 },
  { label: 'Sáb.', value: 6 },
  { label: 'Dom.', value: 0 },
]

export type LocalSlot = { _key: string; dayOfWeek: number; startTime: string; endTime: string }

// ── Shared small components ───────────────────────────────────────────────────

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        'h-8 w-[110px] px-2 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-md outline-none',
        'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors',
      )}
    />
  )
}

function TextBtn({ label, onClick, disabled, variant = 'default' }: { label: string; onClick: () => void; disabled?: boolean; variant?: 'default' | 'danger' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-7 px-2.5 text-xs font-medium rounded-md border cursor-pointer transition-colors',
        variant === 'danger'
          ? 'border-red-200 text-red-500 hover:bg-red-50'
          : 'border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800',
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
      )}
    >
      {label}
    </button>
  )
}

function AddForm({ onConfirm, onCancel }: { onConfirm: (s: string, e: string) => void; onCancel: () => void }) {
  const [start, setStart] = useState('08:00')
  const [end, setEnd]     = useState('18:00')
  return (
    <div className="flex items-center gap-2">
      <TimeInput value={start} onChange={setStart} />
      <span className="text-gray-400 text-sm">–</span>
      <TimeInput value={end} onChange={setEnd} />
      <button type="button" onClick={() => onConfirm(start, end)}
        className="h-7 px-2.5 bg-emerald-500 text-white text-xs font-semibold rounded-md cursor-pointer hover:bg-emerald-600 transition-colors">
        Confirmar
      </button>
      <button type="button" onClick={onCancel}
        className="h-7 px-2.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
        Cancelar
      </button>
    </div>
  )
}

// ── Create mode (local state) ─────────────────────────────────────────────────

type CreateProps = {
  mode:     'create'
  value:    LocalSlot[]
  onChange: (slots: LocalSlot[]) => void
}

function ScheduleCardCreate({ value, onChange }: Omit<CreateProps, 'mode'>) {
  const [slots, setSlots] = useState<LocalSlot[]>(value)
  const [adding, setAdding] = useState<number | null>(null)

  useEffect(() => { onChange(slots) }, [slots, onChange])

  const byDay = (day: number) => slots.filter(s => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime))

  function handleAdd(dayOfWeek: number, start: string, end: string) {
    setSlots(prev => [...prev, { _key: `${dayOfWeek}-${start}-${end}-${Date.now()}`, dayOfWeek, startTime: start + ':00', endTime: end + ':00' }])
    setAdding(null)
  }

  function handleRemove(key: string) {
    setSlots(prev => prev.filter(s => s._key !== key))
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
      <p className="text-sm font-bold text-gray-900 m-0 mb-5">Horários (Disponível)</p>
      <div className="space-y-3">
        {DAYS.map(({ value: dayValue }) => {
          const daySlots = byDay(dayValue)
          const isAdding = adding === dayValue
          return (
            <CreateDayRows
              key={dayValue}
              dayValue={dayValue}
              slots={daySlots}
              adding={isAdding}
              onAdd={(s, e) => handleAdd(dayValue, s, e)}
              onRemove={handleRemove}
              onOpenAdd={() => setAdding(dayValue)}
              onCloseAdd={() => setAdding(null)}
            />
          )
        })}
      </div>
    </div>
  )
}

function CreateDayRows({ dayValue, slots, adding, onAdd, onRemove, onOpenAdd, onCloseAdd }: {
  dayValue:   number
  slots:      LocalSlot[]
  adding:     boolean
  onAdd:      (s: string, e: string) => void
  onRemove:   (key: string) => void
  onOpenAdd:  () => void
  onCloseAdd: () => void
}) {
  return (
    <div className="flex gap-3">
      <span className="w-10 shrink-0 text-[13px] font-semibold text-gray-700 pt-1.5">
        {DAYS.find(d => d.value === dayValue)?.label}
      </span>
      <div className="flex flex-col gap-1.5 flex-1">
        {slots.length === 0 && !adding && (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-gray-400 italic">Indisponível</span>
            <TextBtn label="Adicionar" onClick={onOpenAdd} />
          </div>
        )}
        {slots.map((slot, idx) => (
          <div key={slot._key} className="flex items-center gap-2 h-8">
            <span className="text-[13px] text-gray-700"><TimeDisplay time={slot.startTime} /></span>
            <span className="text-gray-400 text-sm">–</span>
            <span className="text-[13px] text-gray-700"><TimeDisplay time={slot.endTime} /></span>
            <div className="flex items-center gap-1 ml-1">
              <TextBtn label="Remover" onClick={() => onRemove(slot._key)} variant="danger" />
              {idx === 0 && <TextBtn label="Adicionar" onClick={onOpenAdd} />}
            </div>
          </div>
        ))}
        {adding && <AddForm onConfirm={onAdd} onCancel={onCloseAdd} />}
      </div>
    </div>
  )
}

// ── Edit mode (API) ───────────────────────────────────────────────────────────

type EditProps = {
  mode:           'edit'
  professionalId: string
}

function ScheduleCardEdit({ professionalId }: Omit<EditProps, 'mode'>) {
  const { data: slots = [], isLoading } = useWeeklyAvailability(professionalId)
  const createSlot  = useCreateWeeklyAvailability()
  const deleteSlot  = useDeleteWeeklyAvailability()
  const [adding, setAdding] = useState<number | null>(null)
  const [busy, setBusy]     = useState(false)

  const byDay = (day: number) => slots.filter(s => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime))

  async function handleAdd(dayOfWeek: number, start: string, end: string) {
    setBusy(true)
    try {
      await createSlot.mutateAsync({ professionalId, dayOfWeek, startTime: start + ':00', endTime: end + ':00', slotDurationMinutes: 60 })
    } finally { setBusy(false); setAdding(null) }
  }

  async function handleRemove(id: string) {
    setBusy(true)
    try { await deleteSlot.mutateAsync(id) }
    finally { setBusy(false) }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
      <p className="text-sm font-bold text-gray-900 m-0 mb-5">Horários (Disponível)</p>
      {isLoading ? (
        <div className="text-[13px] text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {DAYS.map(({ value: dayValue }) => {
            const daySlots = byDay(dayValue)
            const isAdding = adding === dayValue
            return (
              <EditDayRows
                key={dayValue}
                dayValue={dayValue}
                slots={daySlots}
                adding={isAdding}
                busy={busy}
                onAdd={(s, e) => handleAdd(dayValue, s, e)}
                onRemove={handleRemove}
                onOpenAdd={() => setAdding(dayValue)}
                onCloseAdd={() => setAdding(null)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function EditDayRows({ dayValue, slots, adding, busy, onAdd, onRemove, onOpenAdd, onCloseAdd }: {
  dayValue:   number
  slots:      WeeklyAvailability[]
  adding:     boolean
  busy:       boolean
  onAdd:      (s: string, e: string) => void
  onRemove:   (id: string) => void
  onOpenAdd:  () => void
  onCloseAdd: () => void
}) {
  return (
    <div className="flex gap-3">
      <span className="w-10 shrink-0 text-[13px] font-semibold text-gray-700 pt-1.5">
        {DAYS.find(d => d.value === dayValue)?.label}
      </span>
      <div className="flex flex-col gap-1.5 flex-1">
        {slots.length === 0 && !adding && (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-gray-400 italic">Indisponível</span>
            <TextBtn label="Adicionar" onClick={onOpenAdd} disabled={busy} />
          </div>
        )}
        {slots.map((slot, idx) => (
          <div key={slot.id} className="flex items-center gap-2 h-8">
            <span className="text-[13px] text-gray-700"><TimeDisplay time={slot.startTime} /></span>
            <span className="text-gray-400 text-sm">–</span>
            <span className="text-[13px] text-gray-700"><TimeDisplay time={slot.endTime} /></span>
            <div className="flex items-center gap-1 ml-1">
              <TextBtn label="Remover" onClick={() => onRemove(slot.id)} disabled={busy} variant="danger" />
              {idx === 0 && <TextBtn label="Adicionar" onClick={onOpenAdd} disabled={busy} />}
            </div>
          </div>
        ))}
        {adding && <AddForm onConfirm={onAdd} onCancel={onCloseAdd} />}
      </div>
    </div>
  )
}

// ── View mode (read-only) ─────────────────────────────────────────────────────

type ViewProps = {
  mode:           'view'
  professionalId: string
}

function ScheduleCardView({ professionalId }: Omit<ViewProps, 'mode'>) {
  const { data: slots = [], isLoading } = useWeeklyAvailability(professionalId)
  const byDay = (day: number) => slots.filter(s => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime))

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
      <p className="text-sm font-bold text-gray-900 m-0 mb-5">Horários (Disponível)</p>
      {isLoading ? (
        <div className="text-[13px] text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {DAYS.map(({ value: dayValue }) => {
            const daySlots = byDay(dayValue)
            return (
              <div key={dayValue} className="flex gap-3">
                <span className="w-10 shrink-0 text-[13px] font-semibold text-gray-700 pt-1.5">
                  {DAYS.find(d => d.value === dayValue)?.label}
                </span>
                <div className="flex flex-col gap-1.5 flex-1">
                  {daySlots.length === 0 ? (
                    <span className="text-[13px] text-gray-400 italic pt-1.5">Indisponível</span>
                  ) : daySlots.map(slot => (
                    <div key={slot.id} className="flex items-center gap-2 h-8">
                      <span className="text-[13px] text-gray-700"><TimeDisplay time={slot.startTime} /></span>
                      <span className="text-gray-400 text-sm">–</span>
                      <span className="text-[13px] text-gray-700"><TimeDisplay time={slot.endTime} /></span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export type ScheduleCardProps = CreateProps | EditProps | ViewProps

export function ScheduleCard(props: ScheduleCardProps) {
  if (props.mode === 'create') {
    return <ScheduleCardCreate value={props.value} onChange={props.onChange} />
  }
  if (props.mode === 'view') {
    return <ScheduleCardView professionalId={props.professionalId} />
  }
  return <ScheduleCardEdit professionalId={props.professionalId} />
}
