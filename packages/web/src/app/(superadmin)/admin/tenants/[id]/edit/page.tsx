'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { superAdminFetch, SuperAdminApiError } from '@/lib/super-admin-api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/FormField'
import { Alert } from '@/components/ui/Alert'

interface Tenant {
  id: string
  slug: string
  name: string
  active: boolean
}

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
})

type FormData = z.infer<typeof schema>

const inputCls = (hasError = false) => cn(
  'w-full h-[42px] px-3 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
  hasError ? 'border-destructive' : 'border-border',
)

export default function EditTenantPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ['sa-tenant', id],
    queryFn: async () => {
      const res = await superAdminFetch(`/super-admin/tenants/${id}`)
      return res.json()
    },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (tenant) reset({ name: tenant.name, slug: tenant.slug })
  }, [tenant, reset])

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await superAdminFetch(`/super-admin/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-tenant', id] })
      queryClient.invalidateQueries({ queryKey: ['sa-tenants'] })
      router.push(`/admin/tenants/${id}`)
    },
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      await mutation.mutateAsync(data)
    } catch (err) {
      if (err instanceof SuperAdminApiError) {
        setServerError(err.status === 409 ? 'Slug já em uso' : err.message)
      }
    }
  }

  if (!tenant) return <p className="text-muted-foreground text-sm">Carregando...</p>

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/tenants/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← {tenant.name}
        </Link>
        <h1 className="text-2xl font-semibold">Editar Tenant</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Nome" error={errors.name?.message}>
          <input {...register('name')} className={inputCls(!!errors.name)} />
        </FormField>

        <FormField label="Slug" error={errors.slug?.message}>
          <input {...register('slug')} className={cn(inputCls(!!errors.slug), 'font-mono')} />
        </FormField>

        {serverError && <Alert variant="error" size="sm">{serverError}</Alert>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {isSubmitting || mutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button variant="secondary" type="button" onClick={() => router.push(`/admin/tenants/${id}`)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
