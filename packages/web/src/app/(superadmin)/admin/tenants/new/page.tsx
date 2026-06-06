'use client'

import { useRouter } from 'next/navigation'
import { superAdminFetch, SuperAdminApiError } from '@/lib/super-admin-api'
import { BackButton } from '@/components/navigation/BackButton'
import { TenantForm, type TenantFormData } from '../_components/TenantForm'

export default function NewTenantPage() {
  const router = useRouter()

  return (
    <div>
      <div className="mb-7">
        <BackButton href="/admin/tenants">Voltar para tenants</BackButton>
      </div>
      <TenantForm
        mode="create"
        onSubmit={async (data: TenantFormData) => {
          try {
            await superAdminFetch('/super-admin/tenants', {
              method: 'POST',
              body: JSON.stringify({
                slug:          data.slug,
                name:          data.name,
                adminName:     data.adminName,
                adminEmail:    data.adminEmail,
                adminPassword: data.adminPassword,
              }),
            })
          } catch (err) {
            if (err instanceof SuperAdminApiError) {
              throw new Error(err.status === 409 ? 'Slug já em uso' : err.message)
            }
            throw err
          }
          router.push('/admin/tenants')
        }}
        onCancel={() => router.push('/admin/tenants')}
      />
    </div>
  )
}
