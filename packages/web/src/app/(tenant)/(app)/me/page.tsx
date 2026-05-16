'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useAdmin } from '@/hooks/useAdmins'
import { useMyProfessionalProfile } from '@/hooks/useProfessionals'
import { useClient } from '@/hooks/useClients'
import { DetailSkeleton } from '@/components/ui/DetailSkeleton'
import { Alert } from '@/components/ui/Alert'
import { AdminDetailView } from '../admins/_components/AdminDetailView'
import { ProfessionalDetailView } from '../professionals/_components/ProfessionalDetailView'
import { ClientDetailView } from '../clients/_components/ClientDetailView'

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google', microsoft: 'Microsoft', facebook: 'Facebook',
}

function LinkedSuccessAlert() {
  const searchParams = useSearchParams()
  const linked       = searchParams.get('linked')
  if (!linked) return null
  return (
    <Alert variant="success" className="mb-4">
      {PROVIDER_LABEL[linked] ?? linked} vinculado com sucesso!
    </Alert>
  )
}

function AdminMe({ userId }: { userId: string }) {
  const { data: admin, isLoading } = useAdmin(userId)
  if (isLoading) return <DetailSkeleton />
  if (!admin)    return <div className="p-12 text-muted-foreground text-sm">Perfil não encontrado.</div>
  return <AdminDetailView admin={admin} profilePage />
}

function ProfessionalMe() {
  const { data: prof, isLoading } = useMyProfessionalProfile()
  if (isLoading) return <DetailSkeleton />
  if (!prof)     return <div className="p-12 text-muted-foreground text-sm">Perfil não encontrado.</div>
  return <ProfessionalDetailView prof={prof} isAdmin={false} isOwnProfile profilePage />
}

function ClientMe({ userId }: { userId: string }) {
  const { data: client, isLoading } = useClient(userId)
  if (isLoading) return <DetailSkeleton />
  if (!client)   return <div className="p-12 text-muted-foreground text-sm">Perfil não encontrado.</div>
  return <ClientDetailView client={client} isAdmin={false} isOwnProfile profilePage />
}

export default function MePage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <>
      <Suspense>
        <LinkedSuccessAlert />
      </Suspense>
      {user.role === 'tenant_admin' && <AdminMe userId={user.id} />}
      {user.role === 'professional' && <ProfessionalMe />}
      {user.role === 'client'       && <ClientMe userId={user.id} />}
    </>
  )
}
