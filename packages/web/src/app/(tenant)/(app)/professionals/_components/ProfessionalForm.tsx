'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { AvatarCropField } from '@/components/ui/AvatarCropField'
import { cn } from '@/lib/utils'

// ── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  email:     z.string().email('E-mail inválido'),
  password:  z.string().min(8, 'Mínimo 8 caracteres'),
  position:  z.string().optional(),
  bio:       z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
})

const editSchema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  position:  z.string().optional(),
  bio:       z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  active:    z.boolean().optional(),
})

// ── Types ─────────────────────────────────────────────────────────────────────

type FormValues = {
  name:      string
  email?:    string
  password?: string
  position?: string
  bio?:      string
  avatarUrl?: string | null
  active?:   boolean
}

export type ProfessionalFormData = FormValues

export type ProfessionalFormProps = {
  mode:           'create' | 'edit'
  defaultValues?: Partial<FormValues>
  onSubmit:       (data: ProfessionalFormData) => Promise<void>
  onCancel?:      () => void
  isAdmin?:       boolean
  isOwnProfile?:  boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = (hasError = false) => cn(
  'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
  hasError ? 'border-red-400' : 'border-gray-200',
)

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfessionalForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isAdmin,
  isOwnProfile,
}: ProfessionalFormProps) {
  const resolver = (mode === 'create'
    ? zodResolver(createSchema)
    : zodResolver(editSchema)) as Resolver<FormValues>

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver,
    defaultValues: {
      name:      defaultValues?.name      ?? '',
      position:  defaultValues?.position  ?? '',
      bio:       defaultValues?.bio       ?? '',
      avatarUrl: defaultValues?.avatarUrl ?? null,
      ...(mode === 'create' ? { email: '', password: '' } : {}),
      ...(mode === 'edit'   ? { active: defaultValues?.active ?? true } : {}),
    },
  })

  const nameValue   = watch('name') ?? ''
  const avatarValue = watch('avatarUrl') ?? null
  const activeValue = watch('active') ?? true
  const showStatus  = mode === 'edit' && isAdmin && !isOwnProfile

  async function submit(data: FormValues) {
    try {
      await onSubmit(data)
    } catch {
      setError('root', { message: mode === 'create'
        ? 'Não foi possível cadastrar. Verifique os dados e tente novamente.'
        : 'Não foi possível salvar as alterações. Verifique os dados e tente novamente.',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>

      {/* ── Card 1: Dados pessoais ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Dados pessoais</p>

        <div className="mb-5">
          <AvatarCropField
            value={avatarValue}
            onChange={(v) => setValue('avatarUrl', v)}
            name={nameValue}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="prof-name" className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input id="prof-name" type="text" {...register('name')} className={inputCls(!!errors.name)} />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500 m-0">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="prof-position" className="block text-[13px] font-medium text-gray-700 mb-1.5">Cargo</label>
            <input id="prof-position" type="text" {...register('position')} className={inputCls(!!errors.position)} />
            {errors.position && (
              <p className="mt-1 text-xs text-red-500 m-0">{errors.position.message}</p>
            )}
          </div>
        </div>

        {mode === 'create' && (
          <>
            <div className="mb-4">
              <label htmlFor="prof-email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                E-mail <span className="text-red-500">*</span>
              </label>
              <input id="prof-email" type="email" {...register('email')} className={inputCls(!!errors.email)} />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 m-0">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="prof-password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Senha inicial <span className="text-red-500">*</span>
              </label>
              <input id="prof-password" type="password" {...register('password')} className={inputCls(!!errors.password)} />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 m-0">{errors.password.message}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Card 2: Perfil ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Perfil</p>

        <div className="mb-4">
          <label htmlFor="prof-bio" className="block text-[13px] font-medium text-gray-700 mb-1.5">Observações</label>
          <textarea
            id="prof-bio"
            {...register('bio')}
            rows={3}
            className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none resize-y transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {showStatus && (
          <div className="max-w-[220px]">
            <label htmlFor="prof-active" className="block text-[13px] font-medium text-gray-700 mb-1.5">Status</label>
            <div className="relative">
              <select
                id="prof-active"
                value={activeValue ? 'true' : 'false'}
                onChange={(e) => setValue('active', e.target.value === 'true')}
                className={cn(inputCls(), 'appearance-none cursor-pointer')}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
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
        )}
      </div>

      {/* ── Footer ── */}
      {errors.root && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
          {errors.root.message}
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
          ) : mode === 'create' ? 'Cadastrar profissional' : 'Salvar alterações'}
        </button>

        {mode === 'edit' && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-[42px] px-5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

    </form>
  )
}
