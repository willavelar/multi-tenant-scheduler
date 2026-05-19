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

const schema = z.object({
  slug:          z.string().min(1).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  name:          z.string().min(1, 'Nome obrigatório'),
  adminEmail:    z.string().email('E-mail inválido'),
  adminName:     z.string().min(1, 'Nome do admin obrigatório'),
  adminPassword: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-md border bg-background px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring',
        className,
      )}
    />
  )
}

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
        <Field label="Slug" error={errors.slug?.message}>
          <Input {...register('slug')} placeholder="minha-empresa" />
        </Field>
        <Field label="Nome" error={errors.name?.message}>
          <Input {...register('name')} placeholder="Minha Empresa" />
        </Field>

        <hr className="my-2" />
        <p className="text-sm font-medium text-muted-foreground">Admin inicial</p>

        <Field label="E-mail do admin" error={errors.adminEmail?.message}>
          <Input {...register('adminEmail')} type="email" />
        </Field>
        <Field label="Nome do admin" error={errors.adminName?.message}>
          <Input {...register('adminName')} />
        </Field>
        <Field label="Senha do admin" error={errors.adminPassword?.message}>
          <Input {...register('adminPassword')} type="password" />
        </Field>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

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
