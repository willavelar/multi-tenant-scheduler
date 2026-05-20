'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { superAdminFetch, SuperAdminApiError } from '@/lib/super-admin-api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/FormField'
import { Alert } from '@/components/ui/Alert'

const schema = z.object({
  slug:          z.string().min(1).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  name:          z.string().min(1, 'Nome obrigatório'),
  adminEmail:    z.string().email('E-mail inválido'),
  adminName:     z.string().min(1, 'Nome do admin obrigatório'),
  adminPassword: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

const inputCls = (hasError = false) => cn(
  'w-full h-[42px] px-3 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
  hasError ? 'border-destructive' : 'border-border',
)

export default function NewTenantPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      await superAdminFetch('/super-admin/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      router.push('/admin/tenants')
    } catch (err) {
      if (err instanceof SuperAdminApiError) {
        setServerError(err.status === 409 ? 'Slug já em uso' : err.message)
      }
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/tenants" className="text-sm text-muted-foreground hover:underline">
          ← Tenants
        </Link>
        <h1 className="text-2xl font-semibold">Novo Tenant</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Slug" error={errors.slug?.message}>
          <input {...register('slug')} placeholder="minha-empresa" className={inputCls(!!errors.slug)} />
        </FormField>

        <FormField label="Nome" error={errors.name?.message}>
          <input {...register('name')} placeholder="Minha Empresa" className={inputCls(!!errors.name)} />
        </FormField>

        <hr className="my-2" />
        <p className="text-sm font-medium text-muted-foreground">Admin inicial</p>

        <FormField label="E-mail do admin" error={errors.adminEmail?.message}>
          <input {...register('adminEmail')} type="email" className={inputCls(!!errors.adminEmail)} />
        </FormField>

        <FormField label="Nome do admin" error={errors.adminName?.message}>
          <input {...register('adminName')} className={inputCls(!!errors.adminName)} />
        </FormField>

        <FormField label="Senha do admin" error={errors.adminPassword?.message}>
          <input {...register('adminPassword')} type="password" className={inputCls(!!errors.adminPassword)} />
        </FormField>

        {serverError && <Alert variant="error" size="sm">{serverError}</Alert>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Criando...' : 'Criar Tenant'}
          </Button>
          <Button variant="secondary" type="button" onClick={() => router.push('/admin/tenants')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
