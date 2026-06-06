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
import { inputCls } from '@/components/fields/inputStyles'

// ── Schemas ─────────────────────────────────────────────────────────────────

const editSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  slug: z.string().min(1, 'Slug obrigatório').regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
})

const createSchema = editSchema.extend({
  adminName:     z.string().min(1, 'Nome do admin obrigatório'),
  adminEmail:    z.string().email('E-mail inválido'),
  adminPassword: z.string().min(6, 'Mínimo 6 caracteres'),
})

export type TenantFormData = z.infer<typeof createSchema>

export type TenantFormProps = {
  mode: 'create' | 'edit'
  /** Pre-fills name/slug in edit mode. */
  defaultValues?: { name: string; slug: string }
  /** Throw an Error to surface its message in the form's alert. */
  onSubmit: (data: TenantFormData) => Promise<void>
  onCancel: () => void
}

const saveIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)

// ── Component ───────────────────────────────────────────────────────────────

export function TenantForm({ mode, defaultValues, onSubmit, onCancel }: TenantFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TenantFormData>({
    resolver: (mode === 'create'
      ? zodResolver(createSchema)
      : zodResolver(editSchema)) as Resolver<TenantFormData>,
    defaultValues: { name: '', slug: '' },
  })

  useEffect(() => {
    if (defaultValues) reset({ name: defaultValues.name, slug: defaultValues.slug })
  }, [defaultValues, reset])

  async function submit(data: TenantFormData) {
    setSubmitError(null)
    try {
      await onSubmit(data)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <FormCard title="Dados do tenant">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nome" error={errors.name?.message}>
            <input {...register('name')} placeholder="Minha Empresa" className={inputCls(!!errors.name)} />
          </FormField>
          <FormField label="Slug" error={errors.slug?.message}>
            <input {...register('slug')} placeholder="minha-empresa" className={cn(inputCls(!!errors.slug), 'font-mono')} />
          </FormField>
        </div>
      </FormCard>

      {mode === 'create' && (
        <FormCard title="Admin inicial" description="Cria o primeiro administrador deste tenant.">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nome do admin" error={errors.adminName?.message}>
              <input {...register('adminName')} className={inputCls(!!errors.adminName)} />
            </FormField>
            <FormField label="E-mail do admin" error={errors.adminEmail?.message}>
              <input {...register('adminEmail')} type="email" className={inputCls(!!errors.adminEmail)} />
            </FormField>
            <FormField label="Senha do admin" error={errors.adminPassword?.message} className="col-span-2 max-w-[280px]">
              <input {...register('adminPassword')} type="password" className={inputCls(!!errors.adminPassword)} />
            </FormField>
          </div>
        </FormCard>
      )}

      {submitError && (
        <div className="mb-4">
          <Alert variant="error" size="sm">{submitError}</Alert>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" size="lg" loading={isSubmitting} icon={saveIcon}>
          {mode === 'create' ? 'Criar Tenant' : 'Salvar alterações'}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
