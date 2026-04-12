'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProfessional, useUpdateProfessional, useDeleteProfessional } from '@/hooks/useProfessionals'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b']
function pickColor(str: string) {
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

const ROLE_LABELS: Record<string, string> = { tenant_admin: 'Administrador', professional: 'Profissional', client: 'Cliente' }

type EditForm = { name: string; position: string; bio: string; active: boolean; role: string }

export default function ProfessionalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: prof, isLoading } = useProfessional(id)
  const update = useUpdateProfessional(id)
  const del    = useDeleteProfessional()

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openModal() {
    if (!prof) return
    setForm({ name: prof.name, position: prof.position ?? '', bio: prof.bio ?? '', active: prof.active, role: prof.role })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    setError('')
    try {
      const patch: Record<string, unknown> = {
        name: form.name,
        position: form.position || undefined,
        bio: form.bio || undefined,
      }
      if (isAdmin) { patch.active = form.active; patch.role = form.role }
      await update.mutateAsync(patch)
      setModalOpen(false)
    } catch {
      setError('Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!prof) return
    if (!confirm(`Excluir ${prof.name}? Esta ação não pode ser desfeita.`)) return
    await del.mutateAsync(prof.id)
    router.push('/professionals')
  }

  const inputCls: React.CSSProperties = {
    width: '100%', height: 40, padding: '0 10px', fontSize: 14,
    border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none',
    fontFamily: 'var(--font-inter, Inter, sans-serif)', color: '#111827',
    boxSizing: 'border-box',
  }

  if (isLoading) {
    return <div style={{ padding: 48, color: '#9ca3af', fontSize: 14 }}>Carregando...</div>
  }
  if (!prof) {
    return <div style={{ padding: 48, color: '#9ca3af', fontSize: 14 }}>Profissional não encontrado.</div>
  }

  const canDelete = isAdmin && prof.userId !== me?.id

  return (
    <>
      <style>{`
        .field-row { display: flex; padding: 14px 0; border-bottom: 1px solid #f3f4f6; font-size: 13.5px; }
        .field-row:last-child { border-bottom: none; }
        .field-label { width: 180px; color: #6b7280; flex-shrink: 0; }
        .field-value { color: #111827; font-weight: 500; }
        .edit-btn { padding: 8px 18px; border: 1px solid #e5e7eb; background: #fff; color: #374151; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.12s; font-family: var(--font-inter, Inter, sans-serif); }
        .edit-btn:hover { background: #f9fafb; }
        .del-btn { padding: 8px 18px; background: #dc2626; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; font-family: var(--font-inter, Inter, sans-serif); }
        .del-btn:hover { background: #b91c1c; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 50; }
        .modal-box { background: #fff; border-radius: 12px; padding: 28px; width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,0.18); }
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
        .cancel-btn { padding: 9px 18px; border: 1px solid #e5e7eb; background: #fff; color: '#374151'; border-radius: 8px; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: var(--font-inter, Inter, sans-serif); }
        .save-btn { padding: 9px 20px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: background 0.15s; font-family: var(--font-inter, Inter, sans-serif); }
        .save-btn:hover:not(:disabled) { background: #4f46e5; }
        .save-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .back-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; color: '#6b7280'; font-weight: 500; background: none; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; padding: 7px 14px; font-family: var(--font-inter, Inter, sans-serif); transition: background 0.12s; }
        .back-btn:hover { background: #f9fafb; }
      `}</style>

      <div style={{ maxWidth: 800 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 2px' }}>
              Profissionais &rsaquo; {prof.name}
            </p>
          </div>
          {isAdmin && (
            <button className="back-btn" onClick={() => router.push('/professionals')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              Voltar para profissionais
            </button>
          )}
        </div>

        {/* Identity header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: pickColor(prof.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
            {initials(prof.name)}
          </div>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: '#111827' }}>{prof.name}</h2>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>{prof.email}</p>
            <code style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>
              ID: {prof.id}
            </code>
          </div>
        </div>

        {/* Profile card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '8px 24px 24px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="field-row"><span className="field-label">Nome</span><span className="field-value">{prof.name}</span></div>
          <div className="field-row"><span className="field-label">Cargo</span><span className="field-value">{prof.position || '—'}</span></div>
          <div className="field-row"><span className="field-label">Observações</span><span className="field-value" style={{ whiteSpace: 'pre-wrap' }}>{prof.bio || '—'}</span></div>
          {isAdmin && (
            <>
              <div className="field-row">
                <span className="field-label">Função</span>
                <span className="field-value">{ROLE_LABELS[prof.role] ?? prof.role}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Status</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: prof.active ? '#dcfce7' : '#f3f4f6', color: prof.active ? '#166534' : '#6b7280', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: prof.active ? '#16a34a' : '#9ca3af' }}/>
                  {prof.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </>
          )}
          <div style={{ marginTop: 20 }}>
            <button className="edit-btn" onClick={openModal}>Editar detalhes</button>
          </div>
        </div>

        {/* Danger zone — admin only, not for own account */}
        {canDelete && (
          <div style={{ marginTop: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', margin: '0 0 12px' }}>Zona de perigo</h3>
            <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>Excluir profissional</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Esta ação excluirá permanentemente o profissional e todos os seus dados. Não pode ser desfeita.</p>
              <button className="del-btn" onClick={handleDelete} disabled={del.isPending}>
                {del.isPending ? 'Excluindo...' : 'Excluir profissional'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {modalOpen && form && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="modal-box">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Editar detalhes</h3>

            {[
              { key: 'name',     label: 'Nome',       type: 'text' },
              { key: 'position', label: 'Cargo',      type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>{label}</label>
                <input
                  type={type}
                  value={form[key as keyof EditForm] as string}
                  onChange={e => setForm(f => f ? { ...f, [key]: e.target.value } : f)}
                  style={inputCls}
                />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Observações</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => f ? { ...f, bio: e.target.value } : f)}
                rows={3}
                style={{ ...inputCls, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
              />
            </div>

            {isAdmin && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Função</label>
                  <select value={form.role} onChange={e => setForm(f => f ? { ...f, role: e.target.value } : f)} style={{ ...inputCls, cursor: 'pointer' }}>
                    <option value="professional">Profissional</option>
                    <option value="tenant_admin">Administrador</option>
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Status</label>
                  <select value={form.active ? 'true' : 'false'} onChange={e => setForm(f => f ? { ...f, active: e.target.value === 'true' } : f)} style={{ ...inputCls, cursor: 'pointer' }}>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </>
            )}

            {error && <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 12px' }}>{error}</p>}

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
