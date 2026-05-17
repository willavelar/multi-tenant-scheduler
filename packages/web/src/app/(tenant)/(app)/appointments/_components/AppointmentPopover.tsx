'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { Appointment } from '@/types'
import { useFormatTime } from '@/hooks/useFormatTime'
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
import { CancelAppointmentModal } from './CancelAppointmentModal'
import { ConfirmStatusModal } from './ConfirmStatusModal'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'

const POPOVER_WIDTH = 300
const POPOVER_HEIGHT = 270

type Props = {
  appointment: Appointment
  blockRect: DOMRect
  onClose: () => void
}

export function AppointmentPopover({ appointment, blockRect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [cancelOpen,    setCancelOpen]    = useState(false)
  const [confirmAction, setConfirmAction] = useState<'confirm' | 'complete' | null>(null)

  const { allowPaidStatus } = useTenantSettingsContext()
  const router = useRouter()
  const { formatISOTime } = useFormatTime()

  const { top, left } = useMemo(() => {
    let l = blockRect.right + 8
    if (l + POPOVER_WIDTH > window.innerWidth - 16) l = blockRect.left - POPOVER_WIDTH - 8
    let t = blockRect.top
    if (t + POPOVER_HEIGHT > window.innerHeight - 16) t = window.innerHeight - POPOVER_HEIGHT - 16
    return { top: Math.max(8, t), left: Math.max(8, l) }
  }, [blockRect])

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Element
      if (target.closest('[data-status-portal]')) return
      if (target.closest('[data-appointment-modal]')) return
      if (ref.current && !ref.current.contains(target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const color = appointment.serviceColor
  const startStr = formatISOTime(appointment.startsAt)
  const endStr = formatISOTime(appointment.endsAt)
  const dateStr = (() => {
    const s = new Date(appointment.startsAt).toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    return s.charAt(0).toUpperCase() + s.slice(1)
  })()

  const { status } = appointment

  const popover = (
    <div
      ref={ref}
      className="fixed z-50 bg-card rounded-xl shadow-2xl border border-border overflow-visible w-[300px]"
      style={{ top, left }}
    >
      {/* Action bar */}
      <div className="flex items-center justify-end gap-1 px-3 py-2.5 bg-muted border-b border-border rounded-t-xl">
        {/* View */}
        <button
          title="Visualizar agendamento"
          className="w-8 h-8 rounded-full border border-border bg-background flex items-center justify-center cursor-pointer text-foreground transition-all duration-150 hover:bg-indigo-500 hover:border-indigo-500 hover:text-white hover:shadow-sm active:scale-95"
          onClick={() => router.push(`/appointments/${appointment.id}`)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </button>

        <div className="w-px h-5 bg-border mx-0.5" />

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
          {appointment.clientAvatarUrl ? (
            <img src={appointment.clientAvatarUrl} alt={appointment.clientName} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
          ) : (
            <span className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold" style={{ background: color }}>
              {appointment.clientName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-[15px] font-bold text-foreground leading-tight">{appointment.clientName}</span>
        </div>
        <div className="pl-[38px] space-y-1.5">
          <div className="flex items-start gap-2 text-muted-foreground text-[12.5px]">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{dateStr} · {startStr} – {endStr}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-[12.5px]">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <span>{appointment.serviceName}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-[12.5px]">
            {appointment.professionalAvatarUrl ? (
              <img src={appointment.professionalAvatarUrl} alt={appointment.professionalName} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-[8px] font-bold">
                {appointment.professionalName.charAt(0).toUpperCase()}
              </span>
            )}
            <span>{appointment.professionalName}</span>
          </div>
          <div className="pt-0.5">
            <AppointmentStatusBadge
              status={status}
              allowPaidStatus={allowPaidStatus}
              onConfirm={() => setConfirmAction('confirm')}
              onComplete={() => setConfirmAction('complete')}
              onCancel={() => setCancelOpen(true)}
            />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {createPortal(popover, document.body)}
      <CancelAppointmentModal
        appointmentId={cancelOpen ? appointment.id : null}
        startsAt={cancelOpen ? appointment.startsAt : null}
        onClose={() => setCancelOpen(false)}
        onSuccess={onClose}
      />
      <ConfirmStatusModal
        action={confirmAction}
        appointmentId={confirmAction ? appointment.id : null}
        onClose={() => setConfirmAction(null)}
        onSuccess={onClose}
      />
    </>
  )
}
