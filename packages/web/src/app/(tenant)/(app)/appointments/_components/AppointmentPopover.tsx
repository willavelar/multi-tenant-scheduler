'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Appointment } from '@/types'
import { formatISOTime } from '@/lib/calendarUtils'
import { clientColor } from '@/lib/calendarColors'
import { useCancelAppointment, useCompleteAppointment, useConfirmAppointment, useDeleteAppointment } from '@/hooks/useAppointments'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { StatusVariant } from '@/components/ui/StatusBadge'

const POPOVER_WIDTH = 300
const POPOVER_HEIGHT = 270

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending: 'Agendado', confirmed: 'Confirmado', cancelled: 'Cancelado', completed: 'Pago',
}
const STATUS_VARIANTS: Record<Appointment['status'], StatusVariant> = {
  pending: 'warning', confirmed: 'success', cancelled: 'error', completed: 'purple',
}

type Props = {
  appointment: Appointment
  blockRect: DOMRect
  onClose: () => void
}

export function AppointmentPopover({ appointment, blockRect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const confirmMut  = useConfirmAppointment()
  const cancelMut   = useCancelAppointment()
  const completeMut = useCompleteAppointment()
  const deleteMut   = useDeleteAppointment()

  let left = blockRect.right + 8
  if (left + POPOVER_WIDTH > window.innerWidth - 16) left = blockRect.left - POPOVER_WIDTH - 8
  let top = blockRect.top
  if (top + POPOVER_HEIGHT > window.innerHeight - 16) top = window.innerHeight - POPOVER_HEIGHT - 16
  top = Math.max(8, top)
  left = Math.max(8, left)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const color = clientColor(appointment.clientId)
  const startStr = formatISOTime(appointment.startsAt)
  const endStr = formatISOTime(appointment.endsAt)
  const dateStr = (() => {
    const s = new Date(appointment.startsAt).toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    return s.charAt(0).toUpperCase() + s.slice(1)
  })()

  function handleStatusChange(action: 'confirm' | 'cancel' | 'complete') {
    setStatusOpen(false)
    if (action === 'confirm')  confirmMut.mutate(appointment.id,  { onSuccess: onClose })
    if (action === 'cancel')   cancelMut.mutate(appointment.id,   { onSuccess: onClose })
    if (action === 'complete') completeMut.mutate(appointment.id, { onSuccess: onClose })
  }

  const isMutating = confirmMut.isPending || cancelMut.isPending || completeMut.isPending || deleteMut.isPending
  const { status } = appointment

  const popover = (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-visible w-[300px]"
      style={{ top, left }}
    >
      {/* Action bar */}
      <div className="flex items-center justify-end gap-1 px-3 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-xl">
        {/* Edit — disabled */}
        <button
          disabled title="Em breve"
          className="w-8 h-8 rounded-full border-none bg-gray-100 flex items-center justify-center text-gray-300 cursor-not-allowed"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        {/* Delete / Confirm delete */}
        {!confirmDelete ? (
          <button
            title="Excluir"
            className="w-8 h-8 rounded-full border-none bg-gray-100 flex items-center justify-center text-red-500 cursor-pointer hover:bg-red-50 transition-colors"
            onClick={() => setConfirmDelete(true)}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              className="text-[11px] px-2 py-1 rounded border border-gray-200 bg-white cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setConfirmDelete(false)}
            >Não</button>
            <button
              disabled={isMutating}
              className="text-[11px] px-2 py-1 rounded bg-red-600 text-white border-none cursor-pointer hover:bg-red-700 disabled:opacity-50 transition-colors"
              onClick={() => deleteMut.mutate(appointment.id, { onSuccess: onClose })}
            >Confirmar</button>
          </div>
        )}

        {/* Status ⋮ */}
        <div className="relative">
          <button
            title="Alterar status"
            className="w-8 h-8 rounded-full border-none bg-gray-100 flex flex-col items-center justify-center gap-[3px] cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => setStatusOpen(o => !o)}
          >
            <span className="w-[3px] h-[3px] bg-gray-600 rounded-full" />
            <span className="w-[3px] h-[3px] bg-gray-600 rounded-full" />
            <span className="w-[3px] h-[3px] bg-gray-600 rounded-full" />
          </button>
          {statusOpen && (
            <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-lg shadow-lg w-44 z-10 overflow-hidden">
              {status !== 'confirmed' && status !== 'completed' && (
                <button className="w-full text-left px-3 py-2 text-[12.5px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer border-none bg-transparent border-b border-gray-100" onClick={() => handleStatusChange('confirm')}>
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />Confirmar
                </button>
              )}
              {status !== 'completed' && status !== 'cancelled' && (
                <button className="w-full text-left px-3 py-2 text-[12.5px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer border-none bg-transparent border-b border-gray-100" onClick={() => handleStatusChange('complete')}>
                  <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />Marcar como Pago
                </button>
              )}
              {status !== 'cancelled' && (
                <button className="w-full text-left px-3 py-2 text-[12.5px] text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer border-none bg-transparent" onClick={() => handleStatusChange('cancel')}>
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />Cancelar
                </button>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Close */}
        <button
          title="Fechar"
          className="w-8 h-8 rounded-full border-none bg-indigo-500 flex items-center justify-center text-white cursor-pointer hover:bg-indigo-600 transition-colors"
          onClick={onClose}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-[15px] font-bold text-gray-900 leading-tight">{appointment.clientName}</span>
        </div>
        <div className="pl-[22px] space-y-1.5">
          <div className="flex items-start gap-2 text-gray-500 text-[12.5px]">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{dateStr} · {startStr} – {endStr}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-[12.5px]">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <span>{appointment.serviceName}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-[12.5px]">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{appointment.professionalName}</span>
          </div>
          <div className="pt-0.5">
            <StatusBadge label={STATUS_LABELS[status]} variant={STATUS_VARIANTS[status]} />
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(popover, document.body)
}
