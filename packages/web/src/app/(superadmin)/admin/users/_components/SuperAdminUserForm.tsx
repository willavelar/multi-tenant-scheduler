'use client'

import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/fields/FormField'
import { FormCard } from '@/components/sections/FormCard'
import { Alert } from '@/components/feedback/Alert'
import { AvatarCropField } from '@/components/fields/AvatarCropField'
import { inputCls } from '@/components/fields/inputStyles'

// ── Schemas ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  email:     z.string().email('E-mail inválido'),
  password:  z.string().min(6, 'Mínimo 6 caracteres'),
  avatarUrl: z.string().nullable().optional(),
})

const editSchema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  avatarUrl: z.string().nullable().optional(),
  active:    z.boolean().optional(),
  password:  z.string().refine(v => !v || v.length >= 6, 'Mínimo 6 caracteres').optional(),
})

type FormValues = {
  name:      string
  email?:    string
  password?: string
  avatarUrl?: string | null
  active?:   boolean
}

export type SuperAdminUserFormData = FormValues

export type SuperAdminUserFormProps = {
  mode:          'create' | 'edit'
  defaultValues?: Partial<FormValues>
  isOwnProfile?: boolean
  onSubmit:      (data: SuperAdminUserFormData) => Promise<void>
  onCancel:      () => void
}

const saveIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)

export function SuperAdminUserForm({ mode, defaultValues, isOwnProfile, onSubmit, onCancel }: SuperAdminUserFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const resolver = (mode === 'create'
    ? zodResolver(createSchema)
    : zodResolver(editSchema)) as Resolver<FormValues>

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver,
    defaultValues: {
      name:      defaultValues?.name      ?? '',
      avatarUrl: defaultValues?.avatarUrl ?? null,
      ...(mode === 'create' ? { email: '', password: '' } : { active: defaultValues?.active ?? true, password: '' }),
    },
  })

  useEffect(() => {
    if (mode === 'edit' && defaultValues) {
      reset({
        name:      defaultValues.name ?? '',
        avatarUrl: defaultValues.avatarUrl ?? null,
        active:    defaultValues.active ?? true,
        password:  '',
      })
    }
  }, [mode, defaultValues, reset])

  const nameValue   = watch('name') ?? ''
  const avatarValue = watch('avatarUrl') ?? null
  const activeValue = watch('active') ?? true

  async function submit(data: FormValues) {
    setSubmitError(null)
    try {
      await onSubmit(data)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <FormCard title="Dados do usuário">
        <div className="mb-5">
          <AvatarCropField value={avatarValue} onChange={(v) => setValue('avatarUrl', v)} name={nameValue} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nome" error={errors.name?.message}>
            <input {...register('name')} className={inputCls(!!errors.name)} />
          </FormField>

          {mode === 'create' && (
            <FormField label="E-mail" error={errors.email?.message}>
              <input {...register('email')} type="email" className={inputCls(!!errors.email)} />
            </FormField>
          )}

          {mode === 'edit' && !isOwnProfile && (
            <FormField label="Status">
              <div className="relative">
                <select
                  value={activeValue ? 'true' : 'false'}
                  onChange={(e) => setValue('active', e.target.value === 'true')}
                  className={cn(inputCls(), 'appearance-none cursor-pointer')}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </FormField>
          )}
        </div>
      </FormCard>

      <FormCard
        title={mode === 'create' ? 'Senha' : 'Alterar senha'}
        description={mode === 'create' ? 'Defina a senha de acesso inicial.' : 'Deixe em branco para manter a senha atual.'}
      >
        <FormField label={mode === 'create' ? 'Senha' : 'Nova senha'} error={errors.password?.message} className="max-w-[280px]">
          <input {...register('password')} type="password" className={inputCls(!!errors.password)} />
        </FormField>
      </FormCard>

      {submitError && (
        <div className="mb-4">
          <Alert variant="error" size="sm">{submitError}</Alert>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" size="lg" loading={isSubmitting} icon={saveIcon}>
          {mode === 'create' ? 'Cadastrar usuário' : 'Salvar alterações'}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
