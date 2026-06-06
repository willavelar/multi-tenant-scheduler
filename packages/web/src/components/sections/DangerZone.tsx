'use client'

import { useState } from 'react'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'

type BlockingAppointment = {
  id: string
  startsAt: string
  endsAt: string
  status: string
  serviceName?: string
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
        <h3 className="text-sm font-bold text-red-500 m-0 mb-3">Zona de perigo</h3>
        <div className="bg-card border border-red-200 dark:border-red-900/50 rounded-xl px-6 py-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground m-0 mb-1.5">{title}</p>
          <p className="text-[13px] text-red-500 m-0 mb-3">
            Não é possível excluir: {blocking.length} agendamento{blocking.length !== 1 ? 's' : ''} futuro{blocking.length !== 1 ? 's' : ''} vinculado{blocking.length !== 1 ? 's' : ''}.
          </p>

          <ul className="m-0 mb-4 p-0 list-none flex flex-col gap-2">
            {blocking.map(apt => (
              <li key={apt.id} className="text-[13px] text-foreground bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">
                <span className="font-medium">{formatDateTime(apt.startsAt)}</span>
                {apt.serviceName && <>{' — '}{apt.serviceName}</>}
                {apt.clientName       && <span className="text-muted-foreground"> · {apt.clientName}</span>}
                {apt.professionalName && <span className="text-muted-foreground"> · {apt.professionalName}</span>}
              </li>
            ))}
          </ul>

          {onForceDelete && !forceConfirm && (
            <div className="flex items-center gap-3">
              <Button variant="destructive" size="md" onClick={() => setForceConfirm(true)}>
                Cancelar todos e excluir
              </Button>
              <Button variant="secondary" size="md" onClick={() => setBlocking(null)}>
                Manter
              </Button>
            </div>
          )}

          {onForceDelete && forceConfirm && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[13px] text-red-500 font-medium">
                Isso cancelará {blocking.length} agendamento{blocking.length !== 1 ? 's' : ''}. Confirma?
              </span>
              <Button variant="destructive" size="md" loading={forcePending} onClick={handleForceDelete}>
                {forcePending ? 'Excluindo...' : 'Sim, cancelar e excluir'}
              </Button>
              <Button variant="secondary" size="md" onClick={() => setForceConfirm(false)}>
                Não
              </Button>
            </div>
          )}

          {!onForceDelete && (
            <Button variant="secondary" size="md" onClick={() => setBlocking(null)}>
              Fechar
            </Button>
          )}

          {error && <p className="text-xs text-red-500 mt-2.5 m-0">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <h3 className="text-sm font-bold text-red-500 m-0 mb-3">Zona de perigo</h3>
      <div className="bg-card border border-red-200 dark:border-red-900/50 rounded-xl px-6 py-5 shadow-sm">
        <p className="text-sm font-semibold text-foreground m-0 mb-1.5">{title}</p>
        <p className="text-[13px] text-muted-foreground m-0 mb-4">{description}</p>

        {!confirm ? (
          <Button variant="destructive" size="md" onClick={() => setConfirm(true)}>
            {deleteLabel}
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-red-500 font-medium">Tem certeza?</span>
            <Button variant="destructive" size="md" loading={pending} onClick={handleDelete}>
              {pending ? 'Excluindo...' : 'Sim, excluir'}
            </Button>
            <Button variant="secondary" size="md" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
          </div>
        )}

        {error && <p className="text-xs text-red-500 mt-2.5 m-0">{error}</p>}
      </div>
    </div>
  )
}
