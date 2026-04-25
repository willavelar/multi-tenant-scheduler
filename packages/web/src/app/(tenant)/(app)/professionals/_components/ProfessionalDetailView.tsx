'use client'

import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/ui/BackButton'
import { DetailCard } from '@/components/ui/DetailCard'
import { FieldRow } from '@/components/ui/FieldRow'
import { DangerZone } from '@/components/ui/DangerZone'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DateTimeCell } from '@/components/ui/DateTimeCell'
import { ScheduleCard } from './ScheduleCard'
import { ExceptionsCard } from './ExceptionsCard'
import type { Professional } from '@/types'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']
function pickColor(str: string) {
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

type Props = {
  prof:         Professional
  isAdmin:      boolean
  isOwnProfile: boolean
  profilePage?: boolean
  onDelete?:    () => void
}

export function ProfessionalDetailView({ prof, isAdmin, isOwnProfile, profilePage, onDelete }: Props) {
  const router = useRouter()

  const showEdit   = isAdmin || profilePage
  const showBack   = !profilePage
  const canDelete  = isAdmin && !isOwnProfile && !profilePage

  return (
    <div>
      <div className="flex justify-between items-center mb-7">
        {showBack
          ? <BackButton href="/professionals">Voltar para profissionais</BackButton>
          : <div />
        }
        {showEdit && (
          <button
            className="px-4 py-2 bg-indigo-500 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
            onClick={() => router.push(`/professionals/${prof.id}/edit`)}
          >
            {profilePage ? 'Editar' : 'Editar profissional'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-7">
        {prof.avatarUrl ? (
          <img src={prof.avatarUrl} alt={prof.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
        ) : (
          <div
            className="w-14 h-14 rounded-full text-white flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: pickColor(prof.name) }}
          >
            {initials(prof.name)}
          </div>
        )}
        <div>
          <h2 className="m-0 mb-0.5 text-lg font-bold text-gray-900">{prof.name}</h2>
          <p className="m-0 mb-1 text-[13px] text-gray-500">{prof.email}</p>
          <code className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            ID: {prof.id}
          </code>
        </div>
      </div>

      <DetailCard>
        <FieldRow label="Nome" value={prof.name} />
        <FieldRow label="E-mail" value={prof.email} />
        <FieldRow label="Telefone" value={prof.phone ?? '—'} />
        <FieldRow label="Cargo" value={prof.position ?? '—'} />
        <FieldRow label="Observações" value={<span className="whitespace-pre-wrap">{prof.bio || '—'}</span>} />
        {isAdmin && (
          <FieldRow label="Status" value={
            <StatusBadge label={prof.active ? 'Ativo' : 'Inativo'} variant={prof.active ? 'success' : 'neutral'} />
          } />
        )}
        <FieldRow label="Último login" value={<DateTimeCell iso={prof.lastLoginAt} />} />
        <FieldRow label="Cadastrado em" value={<DateTimeCell iso={prof.createdAt} />} />
      </DetailCard>

      <ScheduleCard mode="view" professionalId={prof.id} />
      <ExceptionsCard mode="view" professionalId={prof.id} />

      {canDelete && onDelete && (
        <DangerZone
          title="Excluir profissional"
          description="Esta ação excluirá permanentemente o profissional e todos os seus dados. Não pode ser desfeita."
          onDelete={onDelete}
          deleteLabel="Excluir profissional"
        />
      )}
    </div>
  )
}
