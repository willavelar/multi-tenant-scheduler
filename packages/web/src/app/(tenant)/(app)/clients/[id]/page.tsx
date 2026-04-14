'use client'

import { useRouter, useParams } from 'next/navigation'
import { useClient, useDeleteClient } from '@/hooks/useClients'
import { useAuth } from '@/providers/AuthProvider'
import { AvatarName } from '@/components/ui/AvatarName'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { BackButton } from '@/components/ui/BackButton'
import { DetailCard } from '@/components/ui/DetailCard'
import { FieldRow } from '@/components/ui/FieldRow'
import { DangerZone } from '@/components/ui/DangerZone'

const PERIOD_LABELS: Record<string, string> = { day: 'dia', week: 'semana', month: 'mês' }

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

function ClientStatusBadge({ active }: { active: boolean | null }) {
  const on = active !== false
  return <StatusBadge label={on ? 'Ativo' : 'Inativo'} variant={on ? 'success' : 'error'} />
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: client, isLoading } = useClient(id)
  const del = useDeleteClient()

  async function handleDelete() {
    if (!client) return
    await del.mutateAsync(client.id)
    router.push('/clients')
  }

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  if (!client) return <div className="p-12 text-gray-400 text-sm">Cliente não encontrado.</div>

  const limitText = client.serviceLimitCount
    ? `${client.serviceLimitCount} por ${PERIOD_LABELS[client.serviceLimitPeriod ?? ''] ?? client.serviceLimitPeriod}`
    : '—'

  return (
    <div>
      {/* Top bar */}
      <div className="flex justify-between items-center mb-7">
        <BackButton href="/clients">Voltar para clientes</BackButton>
        {isAdmin && (
          <button
            className="px-4 py-2 bg-indigo-500 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
            onClick={() => router.push(`/clients/${id}/edit`)}
          >
            Editar cliente
          </button>
        )}
      </div>

      {/* Identity header */}
      <div className="flex items-center gap-4 mb-7">
        <div
          className="w-14 h-14 rounded-full text-white flex items-center justify-center text-xl font-bold shrink-0"
          style={{ background: pickColor(client.name) }}
        >
          {initials(client.name)}
        </div>
        <div>
          <h2 className="m-0 mb-0.5 text-lg font-bold text-gray-900">{client.name}</h2>
          <p className="m-0 mb-1 text-[13px] text-gray-500">{client.email}</p>
          <code className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            ID: {client.id}
          </code>
        </div>
      </div>

      {/* Profile card */}
      <DetailCard>
        <FieldRow label="Nome" value={client.name} />
        <FieldRow label="E-mail" value={client.email} />
        <FieldRow label="Telefone" value={client.phone ?? '—'} />
        <FieldRow label="Data de nascimento" value={formatBirthDate(client.birthDate)} />
        <FieldRow label="Observações" value={<span className="whitespace-pre-wrap">{client.notes || '—'}</span>} />
        <FieldRow label="Status" value={<ClientStatusBadge active={client.active} />} />
        <FieldRow label="Limite de serviços" value={limitText} />
        <FieldRow label="Profissionais vinculados" value={
          client.allProfessionals ? (
            <span className="text-green-700 font-medium">Todos os profissionais</span>
          ) : client.linkedProfessionals.length === 0 ? (
            <span className="text-gray-400 font-normal">Sem restrição</span>
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
            <span className="text-gray-400 font-normal">Sem restrição</span>
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

      {/* Danger zone */}
      {isAdmin && (
        <DangerZone
          title="Excluir cliente"
          description="Esta ação excluirá permanentemente o cliente e todos os seus agendamentos. Não pode ser desfeita."
          onDelete={handleDelete}
          deleteLabel="Excluir cliente"
        />
      )}
    </div>
  )
}
