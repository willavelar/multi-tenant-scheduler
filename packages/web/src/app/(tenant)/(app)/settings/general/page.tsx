'use client'

import { useAuth } from '@/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { TenantGeneralForm } from '../_components/TenantGeneralForm'

export default function SettingsGeneralPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== 'tenant_admin') router.replace('/appointments')
  }, [user, router])

  if (!user || user.role !== 'tenant_admin') return null

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-lg font-bold text-gray-900 m-0">Gerais</h1>
        <p className="text-[13px] text-gray-500 mt-1 m-0">Configurações gerais do sistema.</p>
      </div>
      <TenantGeneralForm />
    </div>
  )
}
