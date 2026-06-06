'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { superAdminFetch, SuperAdminApiError } from '@/lib/super-admin-api'
import { BackButton } from '@/components/navigation/BackButton'
import { FormSkeleton } from '@/components/loading/FormSkeleton'
import { TenantForm, type TenantFormData } from '../../_components/TenantForm'

interface Tenant {
  id: string
  slug: string
  name: string
  active: boolean
}

export default function EditTenantPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ['sa-tenant', id],
    queryFn: async () => {
      const res = await superAdminFetch(`/super-admin/tenants/${id}`)
      return res.json()
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: { name: string; slug: string }) => {
      const res = await superAdminFetch(`/super-admin/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-tenant', id] })
      queryClient.invalidateQueries({ queryKey: ['sa-tenants'] })
    },
  })

  if (isLoading) return <FormSkeleton />
  if (!tenant)   return <div className="p-12 text-muted-foreground text-sm">Tenant não encontrado.</div>

  return (
    <div>
      <div className="mb-7">
        <BackButton href={`/admin/tenants/${id}`}>Voltar para tenant</BackButton>
      </div>
      <TenantForm
        mode="edit"
        defaultValues={{ name: tenant.name, slug: tenant.slug }}
        onSubmit={async (data: TenantFormData) => {
          try {
            await mutation.mutateAsync({ name: data.name, slug: data.slug })
          } catch (err) {
            if (err instanceof SuperAdminApiError) {
              throw new Error(err.status === 409 ? 'Slug já em uso' : err.message)
            }
            throw err
          }
          router.push(`/admin/tenants/${id}`)
        }}
        onCancel={() => router.push(`/admin/tenants/${id}`)}
      />
    </div>
  )
}
