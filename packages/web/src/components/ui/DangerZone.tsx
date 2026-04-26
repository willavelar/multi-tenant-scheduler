'use client'

import { useState } from 'react'
import { ApiError } from '@/lib/api'

type BlockingAppointment = {
  id: string
  startsAt: string
  endsAt: string
  status: string
  serviceName: string
  clientName?: string
  professionalName?: string
}

type Props = {
  title: string
  description: string
  onDelete: () => Promise<void>
  onForceDelete?: () => Promise<void>
  deleteLabel?: string
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isBlockingBody(body: unknown): body is { blockingAppointments: BlockingAppointment[] } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'blockingAppointments' in body &&
    Array.isArray((body as Record<string, unknown>).blockingAppointments)
  )
}

export function DangerZone({ title, description, onDelete, onForceDelete, deleteLabel = 'Excluir' }: Props) {
  const [confirm, setConfirm]           = useState(false)
  const [pending, setPending]           = useState(false)
  const [error, setError]               = useState('')
  const [blocking, setBlocking]         = useState<BlockingAppointment[] | null>(null)
  const [forceConfirm, setForceConfirm] = useState(false)
  const [forcePending, setForcePending] = useState(false)

  async function handleDelete() {
    setPending(true)
    setError('')
    try {
      await onDelete()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && isBlockingBody(err.body)) {
        setBlocking(err.body.blockingAppointments)
        setConfirm(false)
      } else {
        setError('Não foi possível excluir. Tente novamente.')
        setConfirm(false)
      }
    } finally {
      setPending(false)
    }
  }

  async function handleForceDelete() {
    setForcePending(true)
    setError('')
    try {
      await onForceDelete!()
    } catch {
      setError('Não foi possível excluir. Tente novamente.')
      setForceConfirm(false)
    } finally {
      setForcePending(false)
    }
  }

  if (blocking !== null) {
    return (
      <div className="mt-2">
        <h3 className="text-sm font-bold text-red-600 m-0 mb-3">Zona de perigo</h3>
        <div className="bg-white border border-red-200 rounded-xl px-6 py-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 m-0 mb-1.5">{title}</p>
          <p className="text-[13px] text-red-600 m-0 mb-3">
            Não é possível excluir: {blocking.length} agendamento{blocking.length !== 1 ? 's' : ''} futuro{blocking.length !== 1 ? 's' : ''} vinculado{blocking.length !== 1 ? 's' : ''}.
          </p>

          <ul className="m-0 mb-4 p-0 list-none flex flex-col gap-2">
            {blocking.map(apt => (
              <li key={apt.id} className="text-[13px] text-gray-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <span className="font-medium">{formatDateTime(apt.startsAt)}</span>
                {' — '}{apt.serviceName}
                {apt.clientName       && <span className="text-gray-500"> · {apt.clientName}</span>}
                {apt.professionalName && <span className="text-gray-500"> · {apt.professionalName}</span>}
              </li>
            ))}
          </ul>

          {onForceDelete && !forceConfirm && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForceConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 transition-colors"
              >
                Cancelar todos e excluir
              </button>
              <button
                onClick={() => setBlocking(null)}
                className="px-4 py-2 bg-white text-gray-700 text-[13px] font-medium rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Manter
              </button>
            </div>
          )}

          {onForceDelete && forceConfirm && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[13px] text-red-700 font-medium">
                Isso cancelará {blocking.length} agendamento{blocking.length !== 1 ? 's' : ''}. Confirma?
              </span>
              <button
                onClick={handleForceDelete}
                disabled={forcePending}
                className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
              >
                {forcePending ? 'Excluindo...' : 'Sim, cancelar e excluir'}
              </button>
              <button
                onClick={() => setForceConfirm(false)}
                className="px-4 py-2 bg-white text-gray-700 text-[13px] font-medium rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Não
              </button>
            </div>
          )}

          {!onForceDelete && (
            <button
              onClick={() => setBlocking(null)}
              className="px-4 py-2 bg-white text-gray-700 text-[13px] font-medium rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
          )}

          {error && <p className="text-xs text-red-600 mt-2.5 m-0">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <h3 className="text-sm font-bold text-red-600 m-0 mb-3">Zona de perigo</h3>
      <div className="bg-white border border-red-200 rounded-xl px-6 py-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-900 m-0 mb-1.5">{title}</p>
        <p className="text-[13px] text-gray-500 m-0 mb-4">{description}</p>

        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 transition-colors"
          >
            {deleteLabel}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-red-700 font-medium">Tem certeza?</span>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? 'Excluindo...' : 'Sim, excluir'}
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="px-4 py-2 bg-white text-gray-700 text-[13px] font-medium rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-600 mt-2.5 m-0">{error}</p>}
      </div>
    </div>
  )
}
