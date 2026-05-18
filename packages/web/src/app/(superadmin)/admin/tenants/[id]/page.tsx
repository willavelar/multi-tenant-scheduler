'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { superAdminFetch, SuperAdminApiError } from '@/lib/super-admin-api'

type Tenant = {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  logoDarkUrl: string | null
  confirmationMode: 'auto' | 'manual'
  allowPaidStatus: boolean
  cancellationReasonMode: 'no' | 'optional' | 'required'
  cancellationDeadlineValue: number | null
  cancellationDeadlineUnit: 'minutes' | 'hours' | 'days' | null
  createdAt: string
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['sa-tenant', id],
    queryFn: async () => {
      const res = await superAdminFetch(`/super-admin/tenants/${id}`)
      return res.json() as Promise<Tenant>
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Carregando...
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error instanceof SuperAdminApiError && error.status === 404 ? 'Tenant não encontrado.' : 'Erro ao carregar tenant.'}
        </div>
      </div>
    )
  }

  if (!tenant) return null

  const fieldLabel = (label: string, value: string | number | boolean | null | undefined) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm text-foreground">
        {value === null || value === undefined ? '—' : String(value)}
      </span>
    </div>
  )

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/tenants')}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            ← Tenants
          </button>
          <h1 className="text-xl font-semibold text-foreground">{tenant.name}</h1>
        </div>
        <button
          onClick={() => router.push(`/tenants/${id}/edit`)}
          className="px-4 py-2 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-accent transition-colors"
        >
          Editar
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 grid grid-cols-2 gap-6">
        {fieldLabel('Nome', tenant.name)}
        {fieldLabel('Slug', tenant.slug)}
        {fieldLabel('Modo de confirmação', tenant.confirmationMode)}
        {fieldLabel('Permite status pago', tenant.allowPaidStatus ? 'Sim' : 'Não')}
        {fieldLabel('Modo de cancelamento', tenant.cancellationReasonMode)}
        {fieldLabel(
          'Prazo de cancelamento',
          tenant.cancellationDeadlineValue != null && tenant.cancellationDeadlineUnit
            ? `${tenant.cancellationDeadlineValue} ${tenant.cancellationDeadlineUnit}`
            : null,
        )}
        {fieldLabel('Criado em', new Date(tenant.createdAt).toLocaleDateString('pt-BR'))}
      </div>
    </div>
  )
}
