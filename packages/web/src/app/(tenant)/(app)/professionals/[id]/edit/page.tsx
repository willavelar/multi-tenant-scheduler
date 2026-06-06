'use client'

import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProfessional, useUpdateProfessional } from '@/hooks/useProfessionals'
import { BackButton } from '@/components/navigation/BackButton'
import { ProfessionalForm, type ProfessionalFormData } from '../../_components/ProfessionalForm'
import { FormSkeleton } from '@/components/loading/FormSkeleton'

export default function EditProfessionalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me, updateUser } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: prof, isLoading } = useProfessional(id)
  const isOwnProfile = !!prof && prof.userId === me?.id
  const { mutateAsync } = useUpdateProfessional(id)

  if (isLoading) return <FormSkeleton />
  if (!prof)     return <div className="p-12 text-muted-foreground text-sm">Profissional não encontrado.</div>

  async function handleSubmit(data: ProfessionalFormData) {
    await mutateAsync({
      name:       data.name,
      position:   data.position,
      bio:        data.bio,
      avatarUrl:  data.avatarUrl ?? undefined,
      role:       'professional',
      ...(isAdmin ? { active: data.active } : {}),
    })
    if (isOwnProfile) {
      updateUser({ name: data.name, avatarUrl: data.avatarUrl ?? null })
    }
    router.push(`/professionals/${id}`)
  }

  return (
    <div>
      <div className="mb-7">
        <BackButton href={`/professionals/${id}`}>Voltar para profissional</BackButton>
      </div>
      <ProfessionalForm
        mode="edit"
        professionalId={prof.id}
        userId={prof.userId}
        defaultValues={{
          name:      prof.name,
          position:  prof.position  ?? undefined,
          bio:       prof.bio       ?? undefined,
          avatarUrl: prof.avatarUrl ?? undefined,
          active:     prof.active,
        }}
        isAdmin={isAdmin}
        isOwnProfile={isOwnProfile}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/professionals/${id}`)}
      />
    </div>
  )
}
