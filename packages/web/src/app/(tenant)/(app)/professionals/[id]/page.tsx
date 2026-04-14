'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProfessional, useUpdateProfessional, useDeleteProfessional } from '@/hooks/useProfessionals'
import { BackButton } from '@/components/ui/BackButton'
import { DetailCard } from '@/components/ui/DetailCard'
import { FieldRow } from '@/components/ui/FieldRow'
import { DangerZone } from '@/components/ui/DangerZone'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/utils'

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

const fieldCls = 'w-full h-10 px-2.5 text-sm text-gray-900 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors'

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
    await del.mutateAsync(prof.id)
    router.push('/professionals')
  }

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  if (!prof)    return <div className="p-12 text-gray-400 text-sm">Profissional não encontrado.</div>

  const canDelete = isAdmin && prof.userId !== me?.id

  return (
    <>
      <div className="max-w-[800px]">

        {/* Top bar */}
        <div className="flex justify-between items-start mb-7">
          <p className="text-xs text-gray-400 m-0 mt-0.5">
            Profissionais › {prof.name}
          </p>
          <BackButton href={isAdmin ? '/professionals' : '/appointments'}>
            {isAdmin ? 'Voltar para profissionais' : 'Voltar para agendamentos'}
          </BackButton>
        </div>

        {/* Identity header */}
        <div className="flex items-center gap-4 mb-7">
          <div
            className="w-14 h-14 rounded-full text-white flex items-center justify-center text-lg font-bold shrink-0"
            style={{ background: pickColor(prof.name) }}
          >
            {initials(prof.name)}
          </div>
          <div>
            <h2 className="m-0 mb-0.5 text-lg font-bold text-gray-900">{prof.name}</h2>
            <p className="m-0 mb-1 text-[13px] text-gray-500">{prof.email}</p>
            <code className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              ID: {prof.id}
            </code>
          </div>
        </div>

        {/* Profile card */}
        <DetailCard>
          <FieldRow label="Nome" value={prof.name} />
          <FieldRow label="Cargo" value={prof.position || '—'} />
          <FieldRow label="Observações" value={<span className="whitespace-pre-wrap">{prof.bio || '—'}</span>} />
          {isAdmin && (
            <>
              <FieldRow label="Função" value={ROLE_LABELS[prof.role] ?? prof.role} />
              <FieldRow label="Status" value={
                <StatusBadge label={prof.active ? 'Ativo' : 'Inativo'} variant={prof.active ? 'success' : 'neutral'} />
              } />
            </>
          )}
          <div className="mt-5">
            <button
              className="px-4 py-2 border border-gray-200 bg-white text-gray-700 text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={openModal}
            >
              Editar detalhes
            </button>
          </div>
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

      {/* Edit modal */}
      {modalOpen && form && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div className="bg-white rounded-xl p-7 w-full max-w-[480px] shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 m-0 mb-5">Editar detalhes</h3>

            {[
              { key: 'name',     label: 'Nome',  type: 'text' },
              { key: 'position', label: 'Cargo', type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key} className="mb-3.5">
                <label className="block text-[13px] font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof EditForm] as string}
                  onChange={e => setForm(f => f ? { ...f, [key]: e.target.value } : f)}
                  className={fieldCls}
                />
              </div>
            ))}

            <div className="mb-3.5">
              <label className="block text-[13px] font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => f ? { ...f, bio: e.target.value } : f)}
                rows={3}
                className="w-full px-2.5 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg outline-none resize-y focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
              />
            </div>

            {isAdmin && (
              <>
                <div className="mb-3.5">
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Função</label>
                  <div className="relative">
                    <select
                      value={form.role}
                      onChange={e => setForm(f => f ? { ...f, role: e.target.value } : f)}
                      className="w-full h-10 pl-2.5 pr-8 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
                    >
                      <option value="professional">Profissional</option>
                      <option value="tenant_admin">Administrador</option>
                    </select>
                    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                <div className="mb-3.5">
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Status</label>
                  <div className="relative">
                    <select
                      value={form.active ? 'true' : 'false'}
                      onChange={e => setForm(f => f ? { ...f, active: e.target.value === 'true' } : f)}
                      className="w-full h-10 pl-2.5 pr-8 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
              </>
            )}

            {error && <p className="text-xs text-red-600 m-0 mb-3">{error}</p>}

            <div className="flex justify-end gap-2.5 mt-6">
              <button
                className="px-4 py-[9px] border border-gray-200 bg-white text-gray-700 text-[13.5px] font-semibold rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="px-5 py-[9px] bg-indigo-500 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
