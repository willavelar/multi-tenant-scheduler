'use client'

import { useRouter } from 'next/navigation'
import { useCreateClient } from '@/hooks/useClients'
import { BackButton } from '@/components/ui/BackButton'
import { ClientForm, type ClientFormData } from '../_components/ClientForm'

export default function NewClientPage() {
  const router = useRouter()
  const { mutateAsync } = useCreateClient()

  return (
    <div>
      <BackButton href="/clients" variant="ghost">Voltar para clientes</BackButton>
      <ClientForm
        mode="create"
        onSubmit={async (data: ClientFormData) => {
          await mutateAsync({
            name:             data.name,
            email:            data.email,
            password:         data.password!,
            phone:            data.phone,
            birthDate:        data.birthDate,
            notes:            data.notes,
            active:           data.active,
            avatarUrl:        data.avatarUrl,
            allProfessionals: data.allProfessionals,
            allServices:      data.allServices,
            professionalIds:  data.professionalIds,
            serviceIds:       data.serviceIds,
            ...(data.serviceLimitCount != null
              ? { serviceLimitCount: data.serviceLimitCount, serviceLimitPeriod: data.serviceLimitPeriod }
              : {}),
          })
          router.push('/clients')
        }}
        onCancel={() => router.push('/clients')}
      />
    </div>
  )
}
