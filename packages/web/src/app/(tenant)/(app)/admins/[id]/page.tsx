'use client'

import { useParams } from 'next/navigation'
import { useAdmin } from '@/hooks/useAdmins'
import { AdminDetailView } from '../_components/AdminDetailView'
import { DetailSkeleton } from '@/components/ui/DetailSkeleton'

export default function AdminDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: admin, isLoading } = useAdmin(id)

  if (isLoading) return <DetailSkeleton />
  if (!admin)    return <div className="p-12 text-muted-foreground text-sm">Administrador não encontrado.</div>

  return <AdminDetailView admin={admin} />
}
