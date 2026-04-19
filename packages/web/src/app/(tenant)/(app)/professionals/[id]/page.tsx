'use client'

import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProfessional, useDeleteProfessional } from '@/hooks/useProfessionals'
import { BackButton } from '@/components/ui/BackButton'
import { DetailCard } from '@/components/ui/DetailCard'
import { FieldRow } from '@/components/ui/FieldRow'
import { DangerZone } from '@/components/ui/DangerZone'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DateTimeCell } from '@/components/ui/DateTimeCell'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']
function pickColor(str: string) {
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}


export default function ProfessionalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: prof, isLoading } = useProfessional(id)
  const del = useDeleteProfessional()

  async function handleDelete() {
    if (!prof) return
    await del.mutateAsync(prof.id)
    router.push('/professionals')
  }

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  if (!prof)    return <div className="p-12 text-gray-400 text-sm">Profissional não encontrado.</div>

  const canDelete = isAdmin && prof.userId !== me?.id

  return (
    <div>
      {/* Top bar */}
      <div className="flex justify-between items-center mb-7">
        <BackButton href="/professionals">Voltar para profissionais</BackButton>
        {isAdmin && (
          <button
            className="px-4 py-2 bg-indigo-500 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
            onClick={() => router.push(`/professionals/${id}/edit`)}
          >
            Editar profissional
          </button>
        )}
      </div>

      {/* Identity header */}
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

      {/* Detail card */}
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

      {canDelete && (
        <DangerZone
          title="Excluir profissional"
          description="Esta ação excluirá permanentemente o profissional e todos os seus dados. Não pode ser desfeita."
          onDelete={handleDelete}
          deleteLabel="Excluir profissional"
        />
      )}
    </div>
  )
}
