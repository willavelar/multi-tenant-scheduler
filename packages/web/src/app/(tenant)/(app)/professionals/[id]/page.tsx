'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProfessional, useDeleteProfessional, useForceDeleteProfessional } from '@/hooks/useProfessionals'
import { ProfessionalDetailView } from '../_components/ProfessionalDetailView'
import { DetailSkeleton } from '@/components/loading/DetailSkeleton'

export default function ProfessionalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: prof, isLoading } = useProfessional(id)
  const del      = useDeleteProfessional()
  const forceDel = useForceDeleteProfessional()

  if (isLoading) return <DetailSkeleton />
  if (!prof)     return <div className="p-12 text-muted-foreground text-sm">Profissional não encontrado.</div>

  const isOwnProfile = prof.userId === me?.id
  const canDelete    = isAdmin && !isOwnProfile

  async function handleDelete() {
    await del.mutateAsync(prof!.id)
    router.push('/professionals')
  }

  async function handleForceDelete() {
    await forceDel.mutateAsync(prof!.id)
    router.push('/professionals')
  }

  return (
    <ProfessionalDetailView
      prof={prof}
      isAdmin={isAdmin}
      isOwnProfile={isOwnProfile}
      onDelete={canDelete ? handleDelete : undefined}
      onForceDelete={canDelete ? handleForceDelete : undefined}
    />
  )
}
