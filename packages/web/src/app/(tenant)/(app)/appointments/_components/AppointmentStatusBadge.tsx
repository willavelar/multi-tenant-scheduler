'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { StatusVariant } from '@/components/ui/StatusBadge'
import type { Appointment } from '@/types'

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending:   'Aguardando confirmação',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Pago',
}

const STATUS_VARIANTS: Record<Appointment['status'], StatusVariant> = {
  pending:   'warning',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'purple',
}

const itemCls = 'w-full text-left px-3 py-2 text-[12.5px] flex items-center gap-2 cursor-pointer border-none bg-transparent transition-colors'

type Props = {
  status: Appointment['status']
  allowPaidStatus: boolean
  onConfirm: () => void
  onComplete: () => void
  onCancel: () => void
}

export function AppointmentStatusBadge({ status, allowPaidStatus, onConfirm, onComplete, onCancel }: Props) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLButtonElement>(null)

  const canConfirm  = status !== 'confirmed' && status !== 'completed'
  const canComplete = allowPaidStatus && status !== 'completed' && status !== 'cancelled'
  const canCancel   = status !== 'cancelled'
  const hasOptions  = canConfirm || canComplete || canCancel

  function handleToggle() {
    if (!hasOptions || !ref.current) return
    if (!open) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen(o => !o)
  }

  function pick(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={handleToggle}
        className="border-0 bg-transparent p-0 block"
        style={{ cursor: hasOptions ? 'pointer' : 'default' }}
      >
        <StatusBadge label={STATUS_LABELS[status]} variant={STATUS_VARIANTS[status]} />
      </button>

      {open && hasOptions && createPortal(
        <>
          <div className="fixed inset-0 z-40" data-status-portal onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-card border border-border rounded-lg shadow-lg w-48 overflow-hidden"
            data-status-portal
            style={{ top: pos.top, left: pos.left }}
          >
            {canConfirm && (
              <button
                className={`${itemCls} text-foreground hover:bg-accent border-b border-border`}
                onClick={() => pick(onConfirm)}
              >
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                Confirmar
              </button>
            )}
            {canComplete && (
              <button
                className={`${itemCls} text-foreground hover:bg-accent border-b border-border`}
                onClick={() => pick(onComplete)}
              >
                <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                Marcar como Pago
              </button>
            )}
            {canCancel && (
              <button
                className={`${itemCls} text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10`}
                onClick={() => pick(onCancel)}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                Cancelar
              </button>
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}
