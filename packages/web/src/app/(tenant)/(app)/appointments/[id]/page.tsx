'use client'

import { useParams } from 'next/navigation'
import { useAppointment } from '@/hooks/useAppointments'
import { AppointmentDetailView } from '../_components/AppointmentDetailView'
import { DetailSkeleton } from '@/components/loading/DetailSkeleton'

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: appointment, isLoading } = useAppointment(id)

  if (isLoading) return <DetailSkeleton fields={5} />
  if (!appointment) return <div className="p-12 text-muted-foreground text-sm">Agendamento não encontrado.</div>

  return <AppointmentDetailView appointment={appointment} />
}
