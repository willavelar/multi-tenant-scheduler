'use client'

import { useRouter } from 'next/navigation'
import { createSuperAdminUser, SuperAdminApiError } from '@/lib/super-admin-api'
import { BackButton } from '@/components/navigation/BackButton'
import { SuperAdminUserForm, type SuperAdminUserFormData } from '../_components/SuperAdminUserForm'

export default function NewSuperAdminUserPage() {
  const router = useRouter()

  return (
    <div>
      <div className="mb-7">
        <BackButton href="/admin/users">Voltar para usuários</BackButton>
      </div>
      <SuperAdminUserForm
        mode="create"
        onSubmit={async (data: SuperAdminUserFormData) => {
          try {
            await createSuperAdminUser({
              name:      data.name,
              email:     data.email!,
              password:  data.password!,
              avatarUrl: data.avatarUrl ?? null,
            })
          } catch (err) {
            if (err instanceof SuperAdminApiError) {
              throw new Error(err.status === 409 ? 'E-mail já está em uso' : err.message)
            }
            throw err
          }
          router.push('/admin/users')
        }}
        onCancel={() => router.push('/admin/users')}
      />
    </div>
  )
}
