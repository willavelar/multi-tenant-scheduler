'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Service } from '@/types'

export type ServiceFormData = {
  name: string
  durationMinutes: number
  description?: string
  active: boolean
}

export type ServiceFormProps = {
  mode: 'create' | 'edit'
  defaultValues?: Service
  onSubmit: (data: ServiceFormData) => Promise<void>
  onCancel: () => void
}

type FormState = {
  name: string
  durationMinutes: string
  description: string
  active: boolean
}

const inputCls = (hasError = false) => cn(
  'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
  hasError ? 'border-red-400' : 'border-gray-200',
)

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120]

export function ServiceForm({ mode, defaultValues, onSubmit, onCancel }: ServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState<FormState>({
    name:            defaultValues?.name            ?? '',
    durationMinutes: defaultValues?.durationMinutes != null ? String(defaultValues.durationMinutes) : '',
    description:     defaultValues?.description     ?? '',
    active:          defaultValues?.active          ?? true,
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
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Dados do serviço</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="service-name" className="block text-[13px] font-medium text-gray-700 mb-1.5">
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
            <label htmlFor="service-duration" className="block text-[13px] font-medium text-gray-700 mb-1.5">
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
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
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
          <label htmlFor="service-description" className="block text-[13px] font-medium text-gray-700 mb-1.5">
            Descrição
          </label>
          <textarea
            id="service-description"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={3}
            placeholder="Descreva o serviço de forma resumida…"
            className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none resize-y transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {mode === 'edit' && (
          <div className="mt-4">
            <label htmlFor="service-active" className="block text-[13px] font-medium text-gray-700 mb-1.5">Status</label>
            <div className="relative max-w-[180px]">
              <select
                id="service-active"
                value={form.active ? 'true' : 'false'}
                onChange={e => set('active', e.target.value === 'true')}
                className="w-full h-[42px] pl-3 pr-8 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 appearance-none cursor-pointer outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {errors.root && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
          {errors.root}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Salvando...
            </>
          ) : mode === 'create' ? 'Cadastrar serviço' : 'Salvar alterações'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-[42px] px-5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>

    </form>
  )
}
