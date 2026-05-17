'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  useWeeklyAvailability,
  useCreateWeeklyAvailability,
  useDeleteWeeklyAvailability,
} from '@/hooks/useWeeklyAvailability'
import { TimeDisplay } from '@/components/ui/TimeDisplay'
import { TimeInputField } from '@/components/ui/TimeInputField'
import { Skeleton } from '@/components/ui/skeleton'
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

const isCompleteTime = (v: string) => /^\d{2}:\d{2}$/.test(v)

function AddForm({ onConfirm, onCancel }: { onConfirm: (s: string, e: string) => void; onCancel: () => void }) {
  const [start, setStart] = useState('08:00')
  const [end, setEnd]     = useState('18:00')
  const canConfirm        = isCompleteTime(start) && isCompleteTime(end)
  return (
    <div className="flex items-center gap-2">
      <TimeInputField
        value={start}
        onChange={setStart}
        className="h-8 w-[110px] px-2 text-[13px] text-foreground bg-background border border-border rounded-md outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
      />
      <span className="text-muted-foreground text-sm">–</span>
      <TimeInputField
        value={end}
        onChange={setEnd}
        className="h-8 w-[110px] px-2 text-[13px] text-foreground bg-background border border-border rounded-md outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
      />
      <button type="button" onClick={() => canConfirm && onConfirm(start, end)} disabled={!canConfirm}
        className="h-7 px-2.5 bg-emerald-500 text-white text-xs font-semibold rounded-md cursor-pointer hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        Confirmar
      </button>
      <Button variant="secondary" size="xs" type="button" onClick={onCancel}>Cancelar</Button>
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
    <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm">
      <p className="text-sm font-bold text-foreground m-0 mb-5">Horários (Disponível)</p>
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
      <span className="w-10 shrink-0 text-[13px] font-semibold text-foreground pt-1.5">
        {DAYS.find(d => d.value === dayValue)?.label}
      </span>
      <div className="flex flex-col gap-1.5 flex-1">
        {slots.length === 0 && !adding && (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground italic">Indisponível</span>
            <Button variant="secondary" size="xs" onClick={onOpenAdd}>Adicionar</Button>
          </div>
        )}
        {slots.map((slot, idx) => (
          <div key={slot._key} className="flex items-center gap-2 h-8">
            <span className="text-[13px] text-foreground"><TimeDisplay time={slot.startTime} /></span>
            <span className="text-muted-foreground text-sm">–</span>
            <span className="text-[13px] text-foreground"><TimeDisplay time={slot.endTime} /></span>
            <div className="flex items-center gap-1 ml-1">
              <Button variant="destructive" size="xs" onClick={() => onRemove(slot._key)}>Remover</Button>
              {idx === 0 && <Button variant="secondary" size="xs" onClick={onOpenAdd}>Adicionar</Button>}
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
    <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm">
      <p className="text-sm font-bold text-foreground m-0 mb-5">Horários (Disponível)</p>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-4 w-8 shrink-0 mt-1" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
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
      <span className="w-10 shrink-0 text-[13px] font-semibold text-foreground pt-1.5">
        {DAYS.find(d => d.value === dayValue)?.label}
      </span>
      <div className="flex flex-col gap-1.5 flex-1">
        {slots.length === 0 && !adding && (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground italic">Indisponível</span>
            <Button variant="secondary" size="xs" disabled={busy} onClick={onOpenAdd}>Adicionar</Button>
          </div>
        )}
        {slots.map((slot, idx) => (
          <div key={slot.id} className="flex items-center gap-2 h-8">
            <span className="text-[13px] text-foreground"><TimeDisplay time={slot.startTime} /></span>
            <span className="text-muted-foreground text-sm">–</span>
            <span className="text-[13px] text-foreground"><TimeDisplay time={slot.endTime} /></span>
            <div className="flex items-center gap-1 ml-1">
              <Button variant="destructive" size="xs" disabled={busy} onClick={() => onRemove(slot.id)}>Remover</Button>
              {idx === 0 && <Button variant="secondary" size="xs" disabled={busy} onClick={onOpenAdd}>Adicionar</Button>}
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
    <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm">
      <p className="text-sm font-bold text-foreground m-0 mb-5">Horários (Disponível)</p>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-4 w-8 shrink-0 mt-1" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {DAYS.map(({ value: dayValue }) => {
            const daySlots = byDay(dayValue)
            return (
              <div key={dayValue} className="flex gap-3">
                <span className="w-10 shrink-0 text-[13px] font-semibold text-foreground pt-1.5">
                  {DAYS.find(d => d.value === dayValue)?.label}
                </span>
                <div className="flex flex-col gap-1.5 flex-1">
                  {daySlots.length === 0 ? (
                    <span className="text-[13px] text-muted-foreground italic pt-1.5">Indisponível</span>
                  ) : daySlots.map(slot => (
                    <div key={slot.id} className="flex items-center gap-2 h-8">
                      <span className="text-[13px] text-foreground"><TimeDisplay time={slot.startTime} /></span>
                      <span className="text-muted-foreground text-sm">–</span>
                      <span className="text-[13px] text-foreground"><TimeDisplay time={slot.endTime} /></span>
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
