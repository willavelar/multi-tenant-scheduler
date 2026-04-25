'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProfessional, useDeleteProfessional } from '@/hooks/useProfessionals'
import { ProfessionalDetailView } from '../_components/ProfessionalDetailView'

export default function ProfessionalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: prof, isLoading } = useProfessional(id)
  const del = useDeleteProfessional()

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  if (!prof)     return <div className="p-12 text-gray-400 text-sm">Profissional não encontrado.</div>

  const isOwnProfile = prof.userId === me?.id

  async function handleDelete() {
    await del.mutateAsync(prof!.id)
    router.push('/professionals')
  }

  return (
    <ProfessionalDetailView
      prof={prof}
      isAdmin={isAdmin}
      isOwnProfile={isOwnProfile}
      onDelete={handleDelete}
    />
  )
}
