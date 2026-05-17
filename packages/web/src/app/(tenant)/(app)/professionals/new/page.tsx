'use client'

import { useRouter } from 'next/navigation'
import { useCreateProfessional } from '@/hooks/useProfessionals'
import { useCreateException } from '@/hooks/useWeeklyAvailability'
import { BackButton } from '@/components/ui/BackButton'
import { ProfessionalForm, type ProfessionalFormData } from '../_components/ProfessionalForm'

export default function NewProfessionalPage() {
  const router = useRouter()
  const { mutateAsync: createProfessional } = useCreateProfessional()
  const { mutateAsync: createException }    = useCreateException()

  async function handleSubmit(data: ProfessionalFormData) {
    const prof = await createProfessional({
      name:       data.name,
      email:      data.email!,
      password:   data.sendInvite ? undefined : data.password!,
      sendInvite: data.sendInvite,
      position:   data.position,
      bio:        data.bio,
      avatarUrl:  data.avatarUrl ?? undefined,
      schedule:   data.schedule?.map(s => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime:   s.endTime,
      })),
    })

    if (data.exceptions?.length) {
      await Promise.all(
        data.exceptions.map(e =>
          createException({
            professionalId: prof.id,
            date:           e.date,
            type:           'block',
            startTime:      e.startTime,
            endTime:        e.endTime,
          })
        )
      )
    }

    router.push('/professionals')
  }

  return (
    <div>
      <BackButton href="/professionals" variant="ghost">Voltar para profissionais</BackButton>
      <ProfessionalForm mode="create" onSubmit={handleSubmit} />
    </div>
  )
}
