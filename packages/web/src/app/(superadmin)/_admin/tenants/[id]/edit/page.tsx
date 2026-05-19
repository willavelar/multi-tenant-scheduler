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
      router.push(`/_admin/tenants/${id}`)
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
        <Link href={`/_admin/tenants/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← {tenant.name}
        </Link>
        <h1 className="text-2xl font-semibold">Editar Tenant</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Nome</label>
          <input
            {...register('name')}
            className={cn(
              'w-full rounded-md border bg-background px-3 py-2 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              errors.name && 'border-destructive',
            )}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Slug</label>
          <input
            {...register('slug')}
            className={cn(
              'w-full rounded-md border bg-background px-3 py-2 text-sm font-mono',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              errors.slug && 'border-destructive',
            )}
          />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {isSubmitting || mutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button variant="secondary" type="button" onClick={() => router.push(`/_admin/tenants/${id}`)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
