'use client'

import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/ui/BackButton'
import { DetailCard } from '@/components/ui/DetailCard'
import { FieldRow } from '@/components/ui/FieldRow'
import { DangerZone } from '@/components/ui/DangerZone'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Service } from '@/types'
import { Button } from '@/components/ui/button'

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

type Props = {
  service:       Service
  onDelete:      () => Promise<void>
  onForceDelete?: () => Promise<void>
}

export function ServiceDetailView({ service, onDelete, onForceDelete }: Props) {
  const router = useRouter()

  return (
    <div>
      <div className="flex justify-between items-center mb-7">
        <BackButton href="/settings/services">Voltar para serviços</BackButton>
        <Button variant="primary" size="md" onClick={() => router.push(`/settings/services/${service.id}/edit`)}>
          Editar serviço
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-7">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        </div>
        <div>
          <h2 className="m-0 mb-0.5 text-lg font-bold text-foreground">{service.name}</h2>
          <p className="m-0 text-[13px] text-muted-foreground">{formatDuration(service.durationMinutes)}</p>
        </div>
      </div>

      <DetailCard>
        <FieldRow label="Nome" value={service.name} />
        <FieldRow label="Duração" value={formatDuration(service.durationMinutes)} />
        <FieldRow
          label="Descrição"
          value={<span className="whitespace-pre-wrap">{service.description || '—'}</span>}
        />
        <FieldRow
          label="Status"
          value={
            <StatusBadge
              label={service.active ? 'Ativo' : 'Inativo'}
              variant={service.active ? 'success' : 'error'}
            />
          }
        />
      </DetailCard>

      <DangerZone
        title="Excluir serviço"
        description="Esta ação excluirá permanentemente o serviço. Agendamentos existentes vinculados a ele podem ser afetados. Não pode ser desfeita."
        onDelete={onDelete}
        onForceDelete={onForceDelete}
        deleteLabel="Excluir serviço"
      />
    </div>
  )
}
