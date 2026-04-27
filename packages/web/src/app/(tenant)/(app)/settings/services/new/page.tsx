'use client'

import { useRouter } from 'next/navigation'
import { useCreateService } from '@/hooks/useServices'
import { BackButton } from '@/components/ui/BackButton'
import { ServiceForm, type ServiceFormData } from '../_components/ServiceForm'

export default function NewServicePage() {
  const router = useRouter()
  const { mutateAsync } = useCreateService()

  return (
    <div>
      <BackButton href="/settings/services" variant="ghost">Voltar para serviços</BackButton>
      <ServiceForm
        mode="create"
        onSubmit={async (data: ServiceFormData) => {
          await mutateAsync({
            name:            data.name,
            durationMinutes: data.durationMinutes,
            description:     data.description,
            active:          data.active,
          })
          router.push('/settings/services')
        }}
        onCancel={() => router.push('/settings/services')}
      />
    </div>
  )
}
