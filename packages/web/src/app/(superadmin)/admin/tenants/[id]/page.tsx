'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { superAdminFetch } from '@/lib/super-admin-api'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/feedback/StatusBadge'
import { DetailHeader } from '@/components/sections/DetailHeader'
import { DetailIdentity } from '@/components/sections/DetailIdentity'
import { DetailCard } from '@/components/sections/DetailCard'
import { FieldRow } from '@/components/data-display/FieldRow'

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
    <div>
      <DetailHeader backHref="/admin/tenants" backLabel="Voltar para tenants">
        <Button
          variant="secondary"
          size="md"
          onClick={() => toggleActive.mutate(!tenant.active)}
          disabled={toggleActive.isPending}
        >
          {tenant.active ? 'Desativar' : 'Reativar'}
        </Button>
        <Button variant="primary" size="md" onClick={() => router.push(`/admin/tenants/${id}/edit`)}>
          Editar tenant
        </Button>
      </DetailHeader>

      <DetailIdentity name={tenant.name} subtitle={tenant.slug} id={tenant.id} />

      <DetailCard>
        <FieldRow label="Nome" value={tenant.name} />
        <FieldRow label="Slug" value={<span className="font-mono">{tenant.slug}</span>} />
        <FieldRow label="Status" value={
          <StatusBadge
            label={tenant.active ? 'Ativo' : 'Inativo'}
            variant={tenant.active ? 'success' : 'neutral'}
          />
        } />
        <FieldRow label="Criado em" value={new Date(tenant.createdAt).toLocaleDateString('pt-BR')} />
      </DetailCard>
    </div>
  )
}
