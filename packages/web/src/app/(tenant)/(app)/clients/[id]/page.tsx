'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useClient, useDeleteClient } from '@/hooks/useClients'
import { useAuth } from '@/providers/AuthProvider'
import { AvatarName } from '@/components/ui/AvatarName'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { BackButton } from '@/components/ui/BackButton'

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
  return (
    <StatusBadge
      label={on ? 'Ativo' : 'Inativo'}
      bg={on ? '#ecfdf5' : '#fef2f2'}
      color={on ? '#059669' : '#dc2626'}
      dot={on ? '#10b981' : '#ef4444'}
    />
  )
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: client, isLoading } = useClient(id)
  const del = useDeleteClient()

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete() {
    if (!client) return
    try {
      await del.mutateAsync(client.id)
      router.push('/clients')
    } catch {
      setDeleteError('Não foi possível excluir o cliente.')
      setDeleteConfirm(false)
    }
  }

  if (isLoading) return <div style={{ padding: 48, color: '#9ca3af', fontSize: 14 }}>Carregando...</div>
  if (!client) return <div style={{ padding: 48, color: '#9ca3af', fontSize: 14 }}>Cliente não encontrado.</div>

  const limitText = client.serviceLimitCount
    ? `${client.serviceLimitCount} por ${PERIOD_LABELS[client.serviceLimitPeriod ?? ''] ?? client.serviceLimitPeriod}`
    : '—'

  return (
    <>
      <style>{`
        .field-row { display: flex; padding: 14px 0; border-bottom: 1px solid #f3f4f6; font-size: 13.5px; }
        .field-row:last-child { border-bottom: none; }
        .field-label { width: 200px; color: #6b7280; flex-shrink: 0; }
        .field-value { color: #111827; font-weight: 500; flex: 1; }
        .edit-btn { padding: 8px 18px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.12s; font-family: var(--font-inter, Inter, sans-serif); }
        .edit-btn:hover { background: #4f46e5; }
        .del-btn { padding: 8px 18px; background: #dc2626; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font-inter, Inter, sans-serif); }
        .del-btn:hover:not(:disabled) { background: #b91c1c; }
        .del-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .linked-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 20px; font-size: 12.5px; color: #0369a1; }
        .svc-pill { display: inline-flex; align-items: center; padding: 3px 10px; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 20px; font-size: 12.5px; color: #6d28d9; }
      `}</style>

      <div>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <BackButton href="/clients">Voltar para clientes</BackButton>
          {isAdmin && (
            <button className="edit-btn" onClick={() => router.push(`/clients/${id}/edit`)}>
              Editar cliente
            </button>
          )}
        </div>

        {/* Identity header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: pickColor(client.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
            {initials(client.name)}
          </div>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: '#111827' }}>{client.name}</h2>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>{client.email}</p>
            <code style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>
              ID: {client.id}
            </code>
          </div>
        </div>

        {/* Profile card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '8px 24px 24px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="field-row"><span className="field-label">Nome</span><span className="field-value">{client.name}</span></div>
          <div className="field-row"><span className="field-label">E-mail</span><span className="field-value">{client.email}</span></div>
          <div className="field-row"><span className="field-label">Telefone</span><span className="field-value">{client.phone ?? '—'}</span></div>
          <div className="field-row"><span className="field-label">Data de nascimento</span><span className="field-value">{formatBirthDate(client.birthDate)}</span></div>
          <div className="field-row"><span className="field-label">Observações</span><span className="field-value" style={{ whiteSpace: 'pre-wrap' }}>{client.notes || '—'}</span></div>
          <div className="field-row"><span className="field-label">Status</span><span className="field-value"><ClientStatusBadge active={client.active} /></span></div>
          <div className="field-row"><span className="field-label">Limite de serviços</span><span className="field-value">{limitText}</span></div>

          <div className="field-row">
            <span className="field-label">Profissionais vinculados</span>
            <span className="field-value">
              {client.allProfessionals ? (
                <span style={{ color: '#059669', fontWeight: 500 }}>Todos os profissionais</span>
              ) : client.linkedProfessionals.length === 0 ? (
                <span style={{ color: '#9ca3af', fontWeight: 400 }}>Sem restrição</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {client.linkedProfessionals.map(p => (
                    <span key={p.professionalId} className="linked-pill">
                      <AvatarName name={p.name} size={18} />
                    </span>
                  ))}
                </div>
              )}
            </span>
          </div>

          <div className="field-row">
            <span className="field-label">Serviços permitidos</span>
            <span className="field-value">
              {client.allServices ? (
                <span style={{ color: '#059669', fontWeight: 500 }}>Todos os serviços</span>
              ) : client.linkedServices.length === 0 ? (
                <span style={{ color: '#9ca3af', fontWeight: 400 }}>Sem restrição</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {client.linkedServices.map(s => (
                    <span key={s.serviceId} className="svc-pill">{s.name}</span>
                  ))}
                </div>
              )}
            </span>
          </div>
        </div>

        {/* Danger zone */}
        {isAdmin && (
          <div style={{ marginTop: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', margin: '0 0 12px' }}>Zona de perigo</h3>
            <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>Excluir cliente</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Esta ação excluirá permanentemente o cliente e todos os seus agendamentos. Não pode ser desfeita.</p>
              {!deleteConfirm ? (
                <button className="del-btn" onClick={() => setDeleteConfirm(true)}>Excluir cliente</button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#b91c1c', fontWeight: 500 }}>Tem certeza?</span>
                  <button className="del-btn" onClick={handleDelete} disabled={del.isPending}>
                    {del.isPending ? 'Excluindo...' : 'Sim, excluir'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    style={{ padding: '8px 16px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-inter, Inter, sans-serif)' }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
              {deleteError && <p style={{ fontSize: 12, color: '#dc2626', margin: '10px 0 0' }}>{deleteError}</p>}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
