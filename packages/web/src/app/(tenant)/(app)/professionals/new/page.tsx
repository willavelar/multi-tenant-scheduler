'use client'

import { useRouter } from 'next/navigation'
import { useCreateProfessional } from '@/hooks/useProfessionals'
import { BackButton } from '@/components/ui/BackButton'
import { ProfessionalForm, type ProfessionalFormData } from '../_components/ProfessionalForm'

export default function NewProfessionalPage() {
  const router = useRouter()
  const { mutateAsync } = useCreateProfessional()

  async function handleSubmit(data: ProfessionalFormData) {
    await mutateAsync({
      name:      data.name,
      email:     data.email!,
      password:  data.password!,
      position:  data.position,
      bio:       data.bio,
      avatarUrl: data.avatarUrl ?? undefined,
    })
    router.push('/professionals')
  }

  return (
    <div className="max-w-[560px]">
      <BackButton href="/professionals" variant="ghost">Voltar para profissionais</BackButton>
      <ProfessionalForm mode="create" onSubmit={handleSubmit} />
    </div>
  )
}
