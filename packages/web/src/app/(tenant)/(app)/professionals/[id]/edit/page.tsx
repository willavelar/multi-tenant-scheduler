'use client'

import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProfessional, useUpdateProfessional } from '@/hooks/useProfessionals'
import { BackButton } from '@/components/ui/BackButton'
import { ProfessionalForm, type ProfessionalFormData } from '../../_components/ProfessionalForm'

export default function EditProfessionalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me, updateUser } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: prof, isLoading } = useProfessional(id)
  const isOwnProfile = !!prof && prof.userId === me?.id
  const { mutateAsync } = useUpdateProfessional(id)

  if (isLoading || !prof) {
    return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  }

  async function handleSubmit(data: ProfessionalFormData) {
    await mutateAsync({
      name:       data.name,
      position:   data.position,
      bio:        data.bio,
      avatarUrl:  data.avatarUrl ?? undefined,
      timezone:   data.timezone,
      timeFormat: data.timeFormat,
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
        defaultValues={{
          name:      prof.name,
          position:  prof.position  ?? undefined,
          bio:       prof.bio       ?? undefined,
          avatarUrl: prof.avatarUrl ?? undefined,
          timezone:   prof.timezone,
          timeFormat: prof.timeFormat,
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
