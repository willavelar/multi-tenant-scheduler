'use client'

import { useParams } from 'next/navigation'
import { useAdmin } from '@/hooks/useAdmins'
import { AdminDetailView } from '../_components/AdminDetailView'

export default function AdminDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: admin, isLoading } = useAdmin(id)

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  if (!admin)    return <div className="p-12 text-gray-400 text-sm">Administrador não encontrado.</div>

  return <AdminDetailView admin={admin} />
}
