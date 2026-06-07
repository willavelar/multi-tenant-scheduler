'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { getSuperAdminUser, updateSuperAdminUser, SuperAdminApiError } from '@/lib/super-admin-api'
import { useSuperAdminAuth } from '@/providers/SuperAdminAuthProvider'
import { BackButton } from '@/components/navigation/BackButton'
import { FormSkeleton } from '@/components/loading/FormSkeleton'
import { SuperAdminUserForm, type SuperAdminUserFormData } from '../../_components/SuperAdminUserForm'

export default function EditSuperAdminUserPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user: me } = useSuperAdminAuth()
  const isOwnProfile = me?.id === id

  const { data: user, isLoading } = useQuery({
    queryKey: ['sa-user', id],
    queryFn: () => getSuperAdminUser(id),
  })

  if (isLoading) return <FormSkeleton />
  if (!user)     return <div className="p-12 text-muted-foreground text-sm">Usuário não encontrado.</div>

  return (
    <div>
      <div className="mb-7">
        <BackButton href={`/admin/users/${id}`}>Voltar para usuário</BackButton>
      </div>
      <SuperAdminUserForm
        mode="edit"
        isOwnProfile={isOwnProfile}
        defaultValues={{ name: user.name, avatarUrl: user.avatarUrl, active: user.active }}
        onSubmit={async (data: SuperAdminUserFormData) => {
          try {
            await updateSuperAdminUser(id, {
              name:      data.name,
              avatarUrl: data.avatarUrl ?? null,
              ...(isOwnProfile ? {} : { active: data.active }),
              ...(data.password ? { password: data.password } : {}),
            })
          } catch (err) {
            if (err instanceof SuperAdminApiError) throw new Error(err.message)
            throw err
          }
          queryClient.invalidateQueries({ queryKey: ['sa-user', id] })
          queryClient.invalidateQueries({ queryKey: ['sa-users'] })
          router.push(`/admin/users/${id}`)
        }}
        onCancel={() => router.push(`/admin/users/${id}`)}
      />
    </div>
  )
}
