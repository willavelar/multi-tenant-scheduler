'use client'

import { useParams, useRouter } from 'next/navigation'
import { useService, useUpdateService } from '@/hooks/useServices'
import { BackButton } from '@/components/navigation/BackButton'
import { ServiceForm, type ServiceFormData } from '../../_components/ServiceForm'
import { FormSkeleton } from '@/components/loading/FormSkeleton'

export default function EditServicePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: service, isLoading } = useService(id)
  const { mutateAsync } = useUpdateService(id)

  if (isLoading || !service) {
    return <FormSkeleton fields={4} />
  }

  return (
    <div>
      <div className="mb-7">
        <BackButton href={`/settings/services/${id}`}>Voltar para serviço</BackButton>
      </div>
      <ServiceForm
        mode="edit"
        defaultValues={service}
        onSubmit={async (data: ServiceFormData) => {
          await mutateAsync({
            name:            data.name,
            durationMinutes: data.durationMinutes,
            description:     data.description,
            active:          data.active,
            color:           data.color,
          })
          router.push(`/settings/services/${id}`)
        }}
        onCancel={() => router.push(`/settings/services/${id}`)}
      />
    </div>
  )
}
