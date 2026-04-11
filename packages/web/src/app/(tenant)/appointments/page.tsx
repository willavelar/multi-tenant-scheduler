'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppointments, useCancelAppointment } from '@/hooks/useAppointments'
import { useAuth } from '@/providers/AuthProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Appointment } from '@/types'

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
}

const STATUS_VARIANTS: Record<Appointment['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  confirmed: 'default',
  cancelled: 'destructive',
  completed: 'outline',
}

export default function MyAppointmentsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { data: appointments, isLoading } = useAppointments()
  const cancel = useCancelAppointment()

  useEffect(() => {
    if (user && (user.role === 'tenant_admin' || user.role === 'professional')) {
      router.replace('/dashboard')
    }
  }, [user, router])

  if (!user || user.role !== 'client') return null
  if (isLoading) return <p className="text-gray-500 p-6">Carregando...</p>

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Meus agendamentos</h1>
        <Button variant="outline" size="sm" onClick={() => router.push('/')}>
          + Novo agendamento
        </Button>
      </div>

      {!appointments?.length && (
        <p className="text-gray-500 text-sm">Você ainda não tem agendamentos.</p>
      )}

      {appointments?.map((appt: Appointment) => (
        <Card key={appt.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium text-sm">
                {new Date(appt.startsAt).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                })}{' '}
                às{' '}
                {new Date(appt.startsAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-xs text-gray-400">ID: {appt.id.slice(0, 8)}...</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANTS[appt.status]}>
                {STATUS_LABELS[appt.status]}
              </Badge>
              {(appt.status === 'pending' || appt.status === 'confirmed') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 border-red-200 hover:bg-red-50"
                  onClick={() => cancel.mutate(appt.id)}
                  disabled={cancel.isPending && cancel.variables === appt.id}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
