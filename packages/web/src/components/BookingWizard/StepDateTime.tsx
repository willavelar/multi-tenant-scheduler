'use client'

import { useState, useMemo } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { useSlots } from '@/hooks/useSlots'
import { useFormatTime } from '@/hooks/useFormatTime'
import { Button } from '@/components/ui/button'

type Props = {
  professionalId: string
  onSelect: (date: string, startTime: string) => void
  onBack: () => void
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function StepDateTime({ professionalId, onSelect, onBack }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const dateStr = selectedDate ? toLocalDateString(selectedDate) : null
  const { data: slots, isLoading, error: slotsError } = useSlots(professionalId, dateStr)
  const { formatTime } = useFormatTime()

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Escolha a data e horário</h2>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        disabled={(date) => date < today}
        className="rounded-md border"
      />
      {selectedDate && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Horários disponíveis</p>
          {isLoading && <p className="text-sm text-gray-400">Carregando...</p>}
          {slotsError && <p className="text-sm text-red-500">Erro ao carregar horários. Tente novamente.</p>}
          {slots && slots.length === 0 && (
            <p className="text-sm text-gray-400">Nenhum horário disponível neste dia.</p>
          )}
          {slots && slots.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot: string) => (
                <Button
                  key={slot}
                  variant="outline"
                  size="sm"
                  onClick={() => onSelect(toLocalDateString(selectedDate!), slot)}
                >
                  {formatTime(slot)}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
      <button onClick={onBack} className="text-sm text-gray-500 hover:underline">
        ← Voltar
      </button>
    </div>
  )
}
