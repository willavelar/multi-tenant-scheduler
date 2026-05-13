'use client'

import { useConfirmAppointment, useCompleteAppointment } from '@/hooks/useAppointments'
import { Button } from '@/components/ui/button'

type Action = 'confirm' | 'complete'

const CONFIG: Record<Action, {
  title: string
  description: string
  buttonLabel: string
  buttonCls: string
  iconBg: string
  iconStroke: string
  icon: React.ReactNode
}> = {
  confirm: {
    title: 'Confirmar agendamento',
    description: 'Tem certeza que deseja confirmar este agendamento?',
    buttonLabel: 'Sim, confirmar',
    buttonCls: 'bg-green-600 hover:bg-green-700 text-white',
    iconBg: 'bg-green-50 dark:bg-green-500/20',
    iconStroke: '#16a34a',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  complete: {
    title: 'Marcar como Pago',
    description: 'Tem certeza que deseja marcar este agendamento como pago?',
    buttonLabel: 'Sim, marcar como Pago',
    buttonCls: 'bg-violet-600 hover:bg-violet-700 text-white',
    iconBg: 'bg-violet-50 dark:bg-violet-500/20',
    iconStroke: '#7c3aed',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
}

type Props = {
  action: Action | null
  appointmentId: string | null
  onClose: () => void
  onSuccess?: () => void
}

export function ConfirmStatusModal({ action, appointmentId, onClose, onSuccess }: Props) {
  const confirmMut  = useConfirmAppointment()
  const completeMut = useCompleteAppointment()

  if (!action || !appointmentId) return null

  const cfg     = CONFIG[action]
  const mut     = action === 'confirm' ? confirmMut : completeMut
  const isPending = mut.isPending

  function handleConfirm() {
    mut.mutate(appointmentId!, {
      onSuccess: () => {
        onSuccess?.()
        onClose()
      },
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      data-appointment-modal
      onClick={() => !isPending && onClose()}
    >
      <div
        className="bg-card rounded-xl p-7 w-full max-w-[400px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className={`w-11 h-11 rounded-full ${cfg.iconBg} flex items-center justify-center mb-4`}>
          {cfg.icon}
        </div>

        <h2 className="text-base font-bold text-foreground m-0 mb-2">{cfg.title}</h2>
        <p className="text-[13.5px] text-muted-foreground m-0 mb-5 leading-relaxed">{cfg.description}</p>

        <div className="flex gap-2.5 justify-end">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isPending}>
            Voltar
          </Button>
          <Button
            size="md"
            loading={isPending}
            onClick={handleConfirm}
            className={cfg.buttonCls}
          >
            {cfg.buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
