'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { inputCls } from '@/components/fields/inputStyles'
import { Button } from '@/components/ui/button'
import { ColorPicker } from '@/components/fields/ColorPicker'
import type { Service } from '@/types'

export type ServiceFormData = {
  name: string
  durationMinutes: number
  description?: string
  active: boolean
  color: string
}

export type ServiceFormProps = {
  mode: 'create' | 'edit'
  defaultValues?: Service
  suggestedColor?: string
  onSubmit: (data: ServiceFormData) => Promise<void>
  onCancel: () => void
}

type FormState = {
  name: string
  durationMinutes: string
  description: string
  active: boolean
  color: string
}

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120]

export function ServiceForm({ mode, defaultValues, suggestedColor = '#6366f1', onSubmit, onCancel }: ServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState<FormState>({
    name:            defaultValues?.name            ?? '',
    durationMinutes: defaultValues?.durationMinutes != null ? String(defaultValues.durationMinutes) : '',
    description:     defaultValues?.description     ?? '',
    active:          defaultValues?.active          ?? true,
    color:           defaultValues?.color           ?? suggestedColor,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'root', string>>>({})

  const set = (k: keyof FormState, v: string | boolean) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState | 'root', string>> = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    const dur = Number(form.durationMinutes)
    if (!form.durationMinutes) e.durationMinutes = 'Duração obrigatória'
    else if (!Number.isInteger(dur) || dur < 1) e.durationMinutes = 'Duração inválida (mínimo 1 minuto)'
    if (!form.color || !/^#[0-9a-fA-F]{6}$/.test(form.color)) e.color = 'Cor inválida'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      await onSubmit({
        name:            form.name.trim(),
        durationMinutes: Number(form.durationMinutes),
        description:     form.description.trim() || undefined,
        active:          form.active,
        color:           form.color,
      })
    } catch {
      setErrors(e => ({ ...e, root: mode === 'create'
        ? 'Não foi possível cadastrar o serviço. Verifique os dados e tente novamente.'
        : 'Não foi possível salvar as alterações. Verifique os dados e tente novamente.',
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── Card 1: Dados do serviço ── */}
      <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-foreground m-0 mb-5">Dados do serviço</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="service-name" className="block text-[13px] font-medium text-foreground mb-1.5">
              Nome <span className="text-red-400">*</span>
            </label>
            <input
              id="service-name"
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: Corte de cabelo"
              className={inputCls(!!errors.name)}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1 m-0">{errors.name}</p>}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="service-duration" className="block text-[13px] font-medium text-foreground mb-1.5">
              Duração (minutos) <span className="text-red-400">*</span>
            </label>
            <input
              id="service-duration"
              type="number"
              min={1}
              value={form.durationMinutes}
              onChange={e => set('durationMinutes', e.target.value)}
              placeholder="Ex: 60"
              className={inputCls(!!errors.durationMinutes)}
            />
            {errors.durationMinutes
              ? <p className="text-xs text-red-500 mt-1 m-0">{errors.durationMinutes}</p>
              : (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {DURATION_PRESETS.map(min => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => set('durationMinutes', String(min))}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors',
                        form.durationMinutes === String(min)
                          ? 'bg-indigo-500 text-white border-indigo-500'
                          : 'bg-background text-muted-foreground border-border hover:border-indigo-300 hover:text-indigo-600'
                      )}
                    >
                      {min < 60 ? `${min} min` : `${min / 60}h`}
                    </button>
                  ))}
                </div>
              )
            }
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="service-description" className="block text-[13px] font-medium text-foreground mb-1.5">
            Descrição
          </label>
          <textarea
            id="service-description"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={3}
            placeholder="Descreva o serviço de forma resumida…"
            className="w-full px-3 py-2.5 text-sm text-foreground bg-background rounded-lg border border-border outline-none resize-y transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        <div className="mt-5">
          <ColorPicker
            label="Cor no calendário"
            required
            value={form.color}
            onChange={v => set('color', v)}
          />
          {errors.color && <p className="text-xs text-red-500 mt-1 m-0">{errors.color}</p>}
        </div>

        {mode === 'edit' && (
          <div className="mt-4">
            <label htmlFor="service-active" className="block text-[13px] font-medium text-foreground mb-1.5">Status</label>
            <div className="relative max-w-[180px]">
              <select
                id="service-active"
                value={form.active ? 'true' : 'false'}
                onChange={e => set('active', e.target.value === 'true')}
                className="w-full h-[42px] pl-3 pr-8 text-sm text-foreground bg-background rounded-lg border border-border appearance-none cursor-pointer outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {errors.root && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 dark:bg-red-500 dark:border-red-500 dark:text-white">
          {errors.root}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
        >
          {mode === 'create' ? 'Cadastrar serviço' : 'Salvar alterações'}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

    </form>
  )
}
