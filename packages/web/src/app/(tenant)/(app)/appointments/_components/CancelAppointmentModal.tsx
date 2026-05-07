'use client'

import { useState } from 'react'
import { useCancelAppointment } from '@/hooks/useAppointments'
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
import { useAuth } from '@/providers/AuthProvider'

const UNIT_MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 } as const

type Props = {
  appointmentId: string | null
  startsAt: string | null
  onClose: () => void
  onSuccess?: () => void
}

export function CancelAppointmentModal({ appointmentId, startsAt, onClose, onSuccess }: Props) {
  const { cancellationReasonMode, cancellationDeadlineValue, cancellationDeadlineUnit } = useTenantSettingsContext()
  const { user } = useAuth()
  const [reason, setReason] = useState('')
  const cancelMut = useCancelAppointment()

  if (!appointmentId) return null

  const isDeadlineBlocked = (() => {
    if (user?.role !== 'client') return false
    if (!cancellationDeadlineValue || !cancellationDeadlineUnit || !startsAt) return false
    const cutoff = new Date(startsAt).getTime() - cancellationDeadlineValue * UNIT_MS[cancellationDeadlineUnit]
    return Date.now() >= cutoff
  })()

  if (isDeadlineBlocked) {
    return (
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl p-7 w-full max-w-[400px] shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-900 m-0 mb-2">
            Prazo de cancelamento encerrado
          </h2>
          <p className="text-[13.5px] text-gray-500 m-0 mb-5 leading-relaxed">
            O prazo para cancelar este agendamento já passou. Entre em contato com o estabelecimento caso precise de ajuda.
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-[9px] border border-gray-200 bg-white text-gray-700 text-[13.5px] font-semibold rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const showTextarea = cancellationReasonMode !== 'no'
  const submitDisabled =
    cancelMut.isPending ||
    (cancellationReasonMode === 'required' && reason.trim().length < 3)

  function handleConfirm() {
    cancelMut.mutate(
      { id: appointmentId!, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          onSuccess?.()
          onClose()
        },
      },
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={() => !cancelMut.isPending && onClose()}
    >
      <div
        className="bg-white rounded-xl p-7 w-full max-w-[400px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        <h2 className="text-base font-bold text-gray-900 m-0 mb-2">
          Cancelar agendamento
        </h2>
        <p className="text-[13.5px] text-gray-500 m-0 mb-5 leading-relaxed">
          Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
        </p>

        {showTextarea && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium text-gray-700">
                Motivo
                {cancellationReasonMode === 'required' && (
                  <span className="text-red-400 ml-0.5">*</span>
                )}
              </label>
              <span className="text-[11px] text-gray-400">{reason.length}/255</span>
            </div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value.slice(0, 255))}
              placeholder="Informe o motivo do cancelamento"
              rows={3}
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none resize-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
            {cancellationReasonMode === 'required' && reason.trim().length > 0 && reason.trim().length < 3 && (
              <p className="text-[11px] text-red-500 mt-1 m-0">Mínimo de 3 caracteres.</p>
            )}
          </div>
        )}

        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onClose}
            disabled={cancelMut.isPending}
            className="px-4 py-[9px] border border-gray-200 bg-white text-gray-700 text-[13.5px] font-semibold rounded-lg cursor-pointer hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitDisabled}
            className="px-5 py-[9px] bg-red-600 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 transition-colors"
          >
            {cancelMut.isPending ? 'Cancelando...' : 'Sim, cancelar'}
          </button>
        </div>
      </div>
    </div>
  )
}
