'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { superAdminFetch } from '@/lib/super-admin-api'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface Tenant {
  id: string
  slug: string
  name: string
  active: boolean
  createdAt: string
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: tenant, isLoading, isError } = useQuery<Tenant>({
    queryKey: ['sa-tenant', id],
    queryFn: async () => {
      const res = await superAdminFetch(`/super-admin/tenants/${id}`)
      return res.json()
    },
  })

  const toggleActive = useMutation({
    mutationFn: async (active: boolean) => {
      const res = await superAdminFetch(`/super-admin/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-tenant', id] })
      queryClient.invalidateQueries({ queryKey: ['sa-tenants'] })
    },
  })

  if (isLoading) return <p className="text-muted-foreground text-sm">Carregando...</p>
  if (isError || !tenant) return <p className="text-destructive text-sm">Tenant não encontrado.</p>

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tenants" className="text-sm text-muted-foreground hover:underline">
          ← Tenants
        </Link>
        <h1 className="text-2xl font-semibold">{tenant.name}</h1>
        <StatusBadge
          label={tenant.active ? 'Ativo' : 'Inativo'}
          variant={tenant.active ? 'success' : 'neutral'}
        />
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex gap-4">
          <dt className="w-24 text-muted-foreground">Slug</dt>
          <dd className="font-mono">{tenant.slug}</dd>
        </div>
        <div className="flex gap-4">
          <dt className="w-24 text-muted-foreground">ID</dt>
          <dd className="font-mono text-xs text-muted-foreground">{tenant.id}</dd>
        </div>
        <div className="flex gap-4">
          <dt className="w-24 text-muted-foreground">Criado em</dt>
          <dd>{new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</dd>
        </div>
      </dl>

      <div className="flex gap-3 pt-2 border-t">
        <Button onClick={() => router.push(`/admin/tenants/${id}/edit`)}>
          Editar
        </Button>
        <Button
          variant="secondary"
          onClick={() => toggleActive.mutate(!tenant.active)}
          disabled={toggleActive.isPending}
        >
          {tenant.active ? 'Desativar' : 'Reativar'}
        </Button>
      </div>
    </div>
  )
}
