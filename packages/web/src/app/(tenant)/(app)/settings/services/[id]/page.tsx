'use client'

import { useParams, useRouter } from 'next/navigation'
import { useService, useDeleteService, useForceDeleteService } from '@/hooks/useServices'
import { ServiceDetailView } from '../_components/ServiceDetailView'

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: service, isLoading, isError } = useService(id)
  const del      = useDeleteService()
  const forceDel = useForceDeleteService()

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  if (isError) return <div className="p-12 text-red-500 text-sm">Erro ao carregar serviço.</div>
  if (!service)  return <div className="p-12 text-gray-400 text-sm">Serviço não encontrado.</div>

  async function handleDelete() {
    await del.mutateAsync(service!.id)
    router.push('/settings/services')
  }

  async function handleForceDelete() {
    await forceDel.mutateAsync(service!.id)
    router.push('/settings/services')
  }

  return <ServiceDetailView service={service} onDelete={handleDelete} onForceDelete={handleForceDelete} />
}
