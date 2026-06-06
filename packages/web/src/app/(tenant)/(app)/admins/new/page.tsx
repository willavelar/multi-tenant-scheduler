'use client'

import { useRouter } from 'next/navigation'
import { useCreateAdmin } from '@/hooks/useAdmins'
import { BackButton } from '@/components/navigation/BackButton'
import { AdminForm, type AdminFormData } from '../_components/AdminForm'

export default function NewAdminPage() {
  const router = useRouter()
  const { mutateAsync } = useCreateAdmin()

  async function handleSubmit(data: AdminFormData) {
    await mutateAsync({
      name:       data.name,
      email:      data.email!,
      password:   data.sendInvite ? undefined : data.password!,
      sendInvite: data.sendInvite,
      avatarUrl:  data.avatarUrl ?? undefined,
    })
    router.push('/admins')
  }

  return (
    <div>
      <BackButton href="/admins" variant="ghost">Voltar para administradores</BackButton>
      <AdminForm mode="create" onSubmit={handleSubmit} />
    </div>
  )
}
