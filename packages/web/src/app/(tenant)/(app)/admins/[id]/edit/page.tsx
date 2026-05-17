'use client'

import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useAdmin, useUpdateAdmin } from '@/hooks/useAdmins'
import { BackButton } from '@/components/ui/BackButton'
import { AdminForm, type AdminFormData } from '../../_components/AdminForm'
import { FormSkeleton } from '@/components/ui/FormSkeleton'

export default function EditAdminPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()

  const { data: admin, isLoading } = useAdmin(id)
  const isOwnProfile = me?.id === id
  const { mutateAsync } = useUpdateAdmin(id)

  if (isLoading) return <FormSkeleton />
  if (!admin)    return <div className="p-12 text-muted-foreground text-sm">Administrador não encontrado.</div>

  async function handleSubmit(data: AdminFormData) {
    await mutateAsync({
      name:       data.name,
      avatarUrl:  data.avatarUrl ?? undefined,
      active:     data.active,
    })
    router.push(`/admins/${id}`)
  }

  return (
    <div>
      <div className="mb-7">
        <BackButton href={`/admins/${id}`}>Voltar para administrador</BackButton>
      </div>
      <AdminForm
        mode="edit"
        isOwnProfile={isOwnProfile}
        userId={id}
        defaultValues={{
          name:       admin.name,
          avatarUrl:  admin.avatarUrl ?? undefined,
          active:     admin.active,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/admins/${id}`)}
      />
    </div>
  )
}
