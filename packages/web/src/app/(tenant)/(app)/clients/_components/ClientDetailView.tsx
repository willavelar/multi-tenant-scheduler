'use client'

import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/navigation/BackButton'
import { DetailCard } from '@/components/sections/DetailCard'
import { FieldRow } from '@/components/data-display/FieldRow'
import { DangerZone } from '@/components/sections/DangerZone'
import { StatusBadge } from '@/components/feedback/StatusBadge'
import { AvatarName } from '@/components/data-display/AvatarName'
import type { ClientDetail } from '@/types'
import { Button } from '@/components/ui/button'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']
function pickColor(str: string) {
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

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
      <div className="flex justify-between items-center mb-7">
        {showBack
          ? <BackButton href="/clients">Voltar para clientes</BackButton>
          : <div />
        }
        {showEdit && (
          <Button variant="primary" size="md" onClick={() => router.push(`/clients/${client.id}/edit`)}>
            {profilePage ? 'Editar' : 'Editar cliente'}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-7">
        {client.avatarUrl ? (
          <img src={client.avatarUrl} alt={client.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
        ) : (
          <div
            className="w-14 h-14 rounded-full text-white flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: pickColor(client.name) }}
          >
            {initials(client.name)}
          </div>
        )}
        <div>
          <h2 className="m-0 mb-0.5 text-lg font-bold text-foreground">{client.name}</h2>
          <p className="m-0 mb-1 text-[13px] text-muted-foreground">{client.email}</p>
          <code className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
            ID: {client.id}
          </code>
        </div>
      </div>

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
