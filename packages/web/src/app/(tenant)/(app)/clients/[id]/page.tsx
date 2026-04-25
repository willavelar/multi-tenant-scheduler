'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useClient, useDeleteClient } from '@/hooks/useClients'
import { ClientDetailView } from '../_components/ClientDetailView'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'
  const isOwnProfile = id === me?.id

  const { data: client, isLoading } = useClient(id)
  const del = useDeleteClient()

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  if (!client)   return <div className="p-12 text-gray-400 text-sm">Cliente não encontrado.</div>

  async function handleDelete() {
    await del.mutateAsync(client!.id)
    router.push('/clients')
  }

  return (
    <ClientDetailView
      client={client}
      isAdmin={isAdmin}
      isOwnProfile={isOwnProfile}
      onDelete={handleDelete}
    />
  )
}
