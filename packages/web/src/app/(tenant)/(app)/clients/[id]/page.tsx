'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useClient, useDeleteClient, useForceDeleteClient } from '@/hooks/useClients'
import { ClientDetailView } from '../_components/ClientDetailView'
import { DetailSkeleton } from '@/components/ui/DetailSkeleton'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const isAdmin      = me?.role === 'tenant_admin'
  const isOwnProfile = id === me?.id

  const { data: client, isLoading } = useClient(id)
  const del      = useDeleteClient()
  const forceDel = useForceDeleteClient()

  if (isLoading) return <DetailSkeleton />
  if (!client)   return <div className="p-12 text-muted-foreground text-sm">Cliente não encontrado.</div>

  const canDelete = isAdmin && !isOwnProfile

  async function handleDelete() {
    await del.mutateAsync(client!.id)
    router.push('/clients')
  }

  async function handleForceDelete() {
    await forceDel.mutateAsync(client!.id)
    router.push('/clients')
  }

  return (
    <ClientDetailView
      client={client}
      isAdmin={isAdmin}
      isOwnProfile={isOwnProfile}
      onDelete={canDelete ? handleDelete : undefined}
      onForceDelete={canDelete ? handleForceDelete : undefined}
    />
  )
}
