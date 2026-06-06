'use client'

import { useRouter } from 'next/navigation'
import { DetailHeader } from '@/components/sections/DetailHeader'
import { DetailIdentity } from '@/components/sections/DetailIdentity'
import { DetailCard } from '@/components/sections/DetailCard'
import { FieldRow } from '@/components/data-display/FieldRow'
import { DangerZone } from '@/components/sections/DangerZone'
import { StatusBadge } from '@/components/feedback/StatusBadge'
import { AvatarName } from '@/components/data-display/AvatarName'
import type { ClientDetail } from '@/types'
import { Button } from '@/components/ui/button'

function formatBirthDate(dateStr: string | null) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const PERIOD_LABELS: Record<string, string> = { day: 'dia', week: 'semana', month: 'mês' }

type Props = {
  client:         ClientDetail
  isAdmin:        boolean
  isOwnProfile:   boolean
  profilePage?:   boolean
  onDelete?:      () => Promise<void>
  onForceDelete?: () => Promise<void>
}

export function ClientDetailView({ client, isAdmin, isOwnProfile, profilePage, onDelete, onForceDelete }: Props) {
  const router = useRouter()

  const showEdit  = isAdmin || profilePage
  const showBack  = !profilePage
  const canDelete = isAdmin && !isOwnProfile && !profilePage

  const limitText = client.serviceLimitCount
    ? `${client.serviceLimitCount} por ${PERIOD_LABELS[client.serviceLimitPeriod ?? ''] ?? client.serviceLimitPeriod}`
    : '—'

  return (
    <div>
      <DetailHeader backHref={showBack ? '/clients' : undefined} backLabel="Voltar para clientes">
        {showEdit && (
          <Button variant="primary" size="md" onClick={() => router.push(`/clients/${client.id}/edit`)}>
            {profilePage ? 'Editar' : 'Editar cliente'}
          </Button>
        )}
      </DetailHeader>

      <DetailIdentity
        name={client.name}
        subtitle={client.email}
        id={client.id}
        avatarUrl={client.avatarUrl}
      />

      <DetailCard>
        <FieldRow label="Nome" value={client.name} />
        <FieldRow label="E-mail" value={client.email} />
        <FieldRow label="Telefone" value={client.phone ?? '—'} />
        <FieldRow label="Data de nascimento" value={formatBirthDate(client.birthDate)} />
        <FieldRow label="Observações" value={<span className="whitespace-pre-wrap">{client.notes || '—'}</span>} />
        {!isOwnProfile && (
          <FieldRow label="Status" value={
            <StatusBadge label={client.active !== false ? 'Ativo' : 'Inativo'} variant={client.active !== false ? 'success' : 'error'} />
          } />
        )}
        <FieldRow label="Limite de serviços" value={limitText} />
        <FieldRow label="Profissionais vinculados" value={
          client.allProfessionals ? (
            <span className="text-green-700 font-medium">Todos os profissionais</span>
          ) : client.linkedProfessionals.length === 0 ? (
            <span className="text-muted-foreground font-normal">Sem restrição</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {client.linkedProfessionals.map(p => (
                <span key={p.professionalId} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-sky-50 border border-sky-200 rounded-full text-[12.5px] text-sky-700">
                  <AvatarName name={p.name} size={18} />
                </span>
              ))}
            </div>
          )
        } />
        <FieldRow label="Serviços permitidos" value={
          client.allServices ? (
            <span className="text-green-700 font-medium">Todos os serviços</span>
          ) : client.linkedServices.length === 0 ? (
            <span className="text-muted-foreground font-normal">Sem restrição</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {client.linkedServices.map(s => (
                <span key={s.serviceId} className="inline-flex items-center px-2.5 py-0.5 bg-violet-50 border border-violet-200 rounded-full text-[12.5px] text-violet-700">
                  {s.name}
                </span>
              ))}
            </div>
          )
        } />
      </DetailCard>

      {canDelete && onDelete && (
        <DangerZone
          title="Excluir cliente"
          description="Esta ação excluirá permanentemente o cliente e todos os seus dados. Não pode ser desfeita."
          onDelete={onDelete}
          onForceDelete={onForceDelete}
          deleteLabel="Excluir cliente"
        />
      )}
    </div>
  )
}
