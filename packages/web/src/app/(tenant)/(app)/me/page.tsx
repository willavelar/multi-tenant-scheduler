'use client'

import { useAuth } from '@/providers/AuthProvider'
import { useAdmin } from '@/hooks/useAdmins'
import { useMyProfessionalProfile } from '@/hooks/useProfessionals'
import { useClient } from '@/hooks/useClients'
import { DetailSkeleton } from '@/components/ui/DetailSkeleton'
import { AdminDetailView } from '../admins/_components/AdminDetailView'
import { ProfessionalDetailView } from '../professionals/_components/ProfessionalDetailView'
import { ClientDetailView } from '../clients/_components/ClientDetailView'

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

  if (user.role === 'tenant_admin') return <AdminMe userId={user.id} />
  if (user.role === 'professional') return <ProfessionalMe />
  if (user.role === 'client')       return <ClientMe userId={user.id} />

  return null
}
