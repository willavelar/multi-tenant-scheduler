'use client'

import { useRouter } from 'next/navigation'
import { useCreateService, useServices } from '@/hooks/useServices'
import { BackButton } from '@/components/navigation/BackButton'
import { ServiceForm, type ServiceFormData } from '../_components/ServiceForm'
import { pickDistinctColor } from '@/lib/calendarColors'

export default function NewServicePage() {
  const router = useRouter()
  const { mutateAsync } = useCreateService()
  const { data: services = [] } = useServices()

  const suggestedColor = pickDistinctColor(services.map(s => s.color))

  return (
    <div>
      <BackButton href="/settings/services" variant="ghost">Voltar para serviços</BackButton>
      <ServiceForm
        mode="create"
        suggestedColor={suggestedColor}
        onSubmit={async (data: ServiceFormData) => {
          await mutateAsync({
            name:            data.name,
            durationMinutes: data.durationMinutes,
            description:     data.description,
            active:          data.active,
            color:           data.color,
          })
          router.push('/settings/services')
        }}
        onCancel={() => router.push('/settings/services')}
      />
    </div>
  )
}
