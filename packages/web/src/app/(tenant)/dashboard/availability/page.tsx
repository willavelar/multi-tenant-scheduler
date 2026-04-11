'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useProfessionals } from '@/hooks/useProfessionals'
import {
  useWeeklyAvailability,
  useCreateWeeklyAvailability,
  useDeleteWeeklyAvailability,
  useExceptions,
  useCreateException,
  useDeleteException,
} from '@/hooks/useWeeklyAvailability'
import { useAuth } from '@/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WeeklyAvailability, ScheduleException } from '@/types'

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const weeklySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  slotDurationMinutes: z.coerce.number().int().min(15),
})

const exceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  type: z.enum(['block', 'extra']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  reason: z.string().optional(),
})

type WeeklyForm = z.infer<typeof weeklySchema>
type ExceptionForm = z.infer<typeof exceptionSchema>

export default function AvailabilityPage() {
  const { user } = useAuth()
  const { data: professionals } = useProfessionals()
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null)

  const profId = selectedProfId

  const { data: weekly } = useWeeklyAvailability(profId)
  const { data: exceptions } = useExceptions(profId)
  const createWeekly = useCreateWeeklyAvailability()
  const deleteWeekly = useDeleteWeeklyAvailability()
  const createException = useCreateException()
  const deleteException = useDeleteException()

  const weeklyForm = useForm<WeeklyForm>({ resolver: zodResolver(weeklySchema) })
  const exceptionForm = useForm<ExceptionForm>({ resolver: zodResolver(exceptionSchema) })

  function submitWeekly(data: WeeklyForm) {
    if (!profId) return
    createWeekly.mutate({ ...data, professionalId: profId }, {
      onSuccess: () => weeklyForm.reset(),
    })
  }

  function submitException(data: ExceptionForm) {
    if (!profId) return
    createException.mutate({ ...data, professionalId: profId }, {
      onSuccess: () => exceptionForm.reset(),
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Disponibilidade</h1>

      {user?.role === 'tenant_admin' && professionals && (
        <div className="w-64">
          <Label>Profissional</Label>
          <Select onValueChange={(v: string | null) => setSelectedProfId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.bio ?? p.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {profId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weekly availability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grade semanal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {weekly?.map((w: WeeklyAvailability) => (
                  <div key={w.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium w-8">{DAY_NAMES[w.dayOfWeek]}</span>
                    <span className="text-gray-500">{w.startTime} – {w.endTime}</span>
                    <Badge variant="secondary">{w.slotDurationMinutes}min</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 h-6 px-2"
                      aria-label={`Remover disponibilidade ${DAY_NAMES[w.dayOfWeek]}`}
                      onClick={() => deleteWeekly.mutate(w.id)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                {!weekly?.length && <p className="text-sm text-gray-400">Nenhuma grade configurada.</p>}
              </div>
              <form onSubmit={weeklyForm.handleSubmit(submitWeekly)} className="space-y-2 border-t pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Dia (0=Dom)</Label>
                    <Input type="number" min={0} max={6} {...weeklyForm.register('dayOfWeek')} />
                    {weeklyForm.formState.errors.dayOfWeek && (
                      <p className="text-xs text-red-500">{weeklyForm.formState.errors.dayOfWeek.message}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Slot (min)</Label>
                    <Input type="number" {...weeklyForm.register('slotDurationMinutes')} placeholder="60" />
                    {weeklyForm.formState.errors.slotDurationMinutes && (
                      <p className="text-xs text-red-500">{weeklyForm.formState.errors.slotDurationMinutes.message}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Início</Label>
                    <Input {...weeklyForm.register('startTime')} placeholder="09:00" />
                  </div>
                  <div>
                    <Label className="text-xs">Fim</Label>
                    <Input {...weeklyForm.register('endTime')} placeholder="18:00" />
                  </div>
                </div>
                <Button type="submit" size="sm" className="w-full" disabled={createWeekly.isPending}>
                  + Adicionar dia
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Exceptions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exceções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {exceptions?.map((e: ScheduleException) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{e.date}</span>
                    <Badge variant={e.type === 'block' ? 'destructive' : 'default'}>
                      {e.type === 'block' ? 'Bloqueio' : 'Extra'}
                    </Badge>
                    <span className="text-gray-500 text-xs">{e.startTime}–{e.endTime}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 h-6 px-2"
                      aria-label={`Remover exceção ${e.date}`}
                      onClick={() => deleteException.mutate(e.id)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                {!exceptions?.length && <p className="text-sm text-gray-400">Nenhuma exceção.</p>}
              </div>
              <form onSubmit={exceptionForm.handleSubmit(submitException)} className="space-y-2 border-t pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs">Data (YYYY-MM-DD)</Label>
                    <Input {...exceptionForm.register('date')} placeholder="2026-04-15" />
                    {exceptionForm.formState.errors.date && (
                      <p className="text-xs text-red-500">{exceptionForm.formState.errors.date.message}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select onValueChange={(v: string | null) => { if (v) exceptionForm.setValue('type', v as 'block' | 'extra') }}>
                      <SelectTrigger><SelectValue placeholder="block/extra" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block">Bloqueio</SelectItem>
                        <SelectItem value="extra">Extra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Motivo</Label>
                    <Input {...exceptionForm.register('reason')} placeholder="Opcional" />
                  </div>
                  <div>
                    <Label className="text-xs">Início</Label>
                    <Input {...exceptionForm.register('startTime')} placeholder="14:00" />
                  </div>
                  <div>
                    <Label className="text-xs">Fim</Label>
                    <Input {...exceptionForm.register('endTime')} placeholder="16:00" />
                  </div>
                </div>
                <Button type="submit" size="sm" className="w-full" disabled={createException.isPending}>
                  + Adicionar exceção
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
