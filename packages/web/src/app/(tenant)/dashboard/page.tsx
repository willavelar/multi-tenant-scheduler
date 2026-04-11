'use client'

import { useAppointments, useConfirmAppointment, useCancelAppointment } from '@/hooks/useAppointments'
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

export default function DashboardPage() {
  const { data: appointments, isLoading } = useAppointments()
  const confirm = useConfirmAppointment()
  const cancel = useCancelAppointment()

  if (isLoading) return <p className="text-gray-500">Carregando agendamentos...</p>
  if (!appointments?.length) return <p className="text-gray-500">Nenhum agendamento encontrado.</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Agendamentos</h1>
      <div className="space-y-3">
        {appointments.map((appt: Appointment) => (
          <Card key={appt.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  {new Date(appt.startsAt).toLocaleDateString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                  })}{' '}
                  às{' '}
                  {new Date(appt.startsAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-xs text-gray-500">ID: {appt.id.slice(0, 8)}...</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANTS[appt.status]}>
                  {STATUS_LABELS[appt.status]}
                </Badge>
                {appt.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => confirm.mutate(appt.id)}
                      disabled={confirm.isPending}
                    >
                      ✓
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => cancel.mutate(appt.id)}
                      disabled={cancel.isPending}
                    >
                      ✕
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
