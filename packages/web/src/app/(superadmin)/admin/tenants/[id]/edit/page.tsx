'use client'

import { use, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { superAdminFetch, SuperAdminApiError } from '@/lib/super-admin-api'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  slug: z
    .string()
    .min(2, 'Slug deve ter pelo menos 2 caracteres')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug inválido: use letras minúsculas, números e hífens')
    .refine((v) => v !== 'app', { message: "O slug 'app' é reservado" }),
})

type FormData = z.infer<typeof schema>

type Tenant = {
  id: string
  slug: string
  name: string
}

export default function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['sa-tenant', id],
    queryFn: async () => {
      const res = await superAdminFetch(`/super-admin/tenants/${id}`)
      return res.json() as Promise<Tenant>
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // Pre-populate form when tenant data loads
  useEffect(() => {
    if (tenant) {
      reset({ name: tenant.name, slug: tenant.slug })
    }
  }, [tenant, reset])

  async function onSubmit(data: FormData) {
    try {
      await superAdminFetch(`/super-admin/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      router.push(`/tenants/${id}`)
    } catch (err) {
      if (err instanceof SuperAdminApiError) {
        if (err.status === 409) {
          setError('slug', { message: 'Slug já em uso' })
        } else if (err.status === 400) {
          setError('root', { message: err.message || 'Dados inválidos' })
        } else if (err.status === 404) {
          setError('root', { message: 'Tenant não encontrado.' })
        } else {
          setError('root', { message: 'Erro ao salvar. Tente novamente.' })
        }
      } else {
        setError('root', { message: 'Erro inesperado. Tente novamente.' })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Carregando...
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push(`/tenants/${id}`)}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          ← Detalhe
        </button>
        <h1 className="text-xl font-semibold text-foreground">Editar Tenant</h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
              Nome
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className={cn(
                'w-full h-11 px-3.5 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-muted-foreground',
                errors.name ? 'border-destructive' : 'border-border',
              )}
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="slug" className="block text-sm font-medium text-foreground mb-1.5">
              Slug
              <span className="ml-2 text-xs text-muted-foreground font-normal">(subdomínio)</span>
            </label>
            <input
              id="slug"
              type="text"
              {...register('slug')}
              className={cn(
                'w-full h-11 px-3.5 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-muted-foreground font-mono',
                errors.slug ? 'border-destructive' : 'border-border',
              )}
            />
            {errors.slug && (
              <p className="mt-1.5 text-xs text-destructive">{errors.slug.message}</p>
            )}
          </div>

          {errors.root && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {errors.root.message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/tenants/${id}`)}
              className="flex-1 h-11 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-11 bg-blue-600 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer hover:bg-blue-700 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
