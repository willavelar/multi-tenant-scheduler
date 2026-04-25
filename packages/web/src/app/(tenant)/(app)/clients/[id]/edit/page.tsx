'use client'

import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import { BackButton } from '@/components/ui/BackButton'
import { ClientForm, type ClientFormData } from '../../_components/ClientForm'

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me, updateUser } = useAuth()
  const isOwnProfile = id === me?.id

  const { data: client, isLoading } = useClient(id)
  const { mutateAsync } = useUpdateClient(id)

  if (isLoading || !client) {
    return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  }

  return (
    <div>
      <div className="mb-7">
        <BackButton href={`/clients/${id}`}>Voltar para cliente</BackButton>
      </div>
      <ClientForm
        mode="edit"
        defaultValues={client}
        isOwnProfile={isOwnProfile}
        onSubmit={async (data: ClientFormData) => {
          await mutateAsync({
            name:             data.name,
            email:            data.email,
            phone:            data.phone,
            birthDate:        data.birthDate,
            notes:            data.notes,
            active:           data.active,
            avatarUrl:        data.avatarUrl,
            timezone:         data.timezone,
            timeFormat:       data.timeFormat,
            allProfessionals: data.allProfessionals,
            allServices:      data.allServices,
            professionalIds:  data.professionalIds,
            serviceIds:       data.serviceIds,
            serviceLimitCount:  data.serviceLimitCount ?? null,
            serviceLimitPeriod: data.serviceLimitCount
              ? data.serviceLimitPeriod ?? null
              : null,
          })
          if (isOwnProfile) updateUser({ name: data.name, avatarUrl: data.avatarUrl ?? null })
          router.push(`/clients/${id}`)
        }}
        onCancel={() => router.push(`/clients/${id}`)}
      />
    </div>
  )
}
