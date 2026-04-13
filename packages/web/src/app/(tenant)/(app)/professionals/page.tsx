'use client'

import { useRouter } from 'next/navigation'
import { useProfessionals, useDeleteProfessional } from '@/hooks/useProfessionals'
import { AvatarName } from '@/components/ui/AvatarName'
import type { Professional } from '@/types'

export default function ProfessionalsPage() {
  const router = useRouter()
  const { data: professionals = [], isLoading } = useProfessionals()
  const del = useDeleteProfessional()

  function handleDelete(prof: Professional) {
    if (!confirm(`Excluir ${prof.name}? Esta ação não pode ser desfeita.`)) return
    del.mutate(prof.id)
  }

  return (
    <>
      <style>{`
        .prof-row:hover { background: #f9fafb; }
        .name-link { color: #111827; font-weight: 600; text-decoration: none; cursor: pointer; background: none; border: none; padding: 0; font-family: var(--font-inter, Inter, sans-serif); font-size: 13.5px; }
        .name-link:hover { color: #6366f1; text-decoration: underline; }
        .del-btn { padding: 5px 12px; border: 1px solid #fecaca; background: #fff; color: #dc2626; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.12s; font-family: var(--font-inter, Inter, sans-serif); }
        .del-btn:hover { background: #fef2f2; }
        .del-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .new-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s; font-family: var(--font-inter, Inter, sans-serif); }
        .new-btn:hover { background: #4f46e5; transform: translateY(-1px); }
      `}</style>

      <div style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            {professionals.length} profissional{professionals.length !== 1 ? 'is' : ''} cadastrado{professionals.length !== 1 ? 's' : ''}
          </p>
          <button className="new-btn" onClick={() => router.push('/professionals/new')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Cadastrar profissional
          </button>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {isLoading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Carregando...</div>
          ) : !professionals.length ? (
            <div style={{ padding: '64px 32px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Nenhum profissional</p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Clique em "Cadastrar profissional" para adicionar.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['Profissional', 'Cargo', 'Função', 'Status', 'Ações'].map(col => (
                    <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {professionals.map((prof: Professional) => (
                  <tr key={prof.id} className="prof-row" style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.1s' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <button className="name-link" style={{ display: 'block', width: '100%', textAlign: 'left' }} onClick={() => router.push(`/professionals/${prof.id}`)}>
                        <AvatarName name={prof.name} subtitle={prof.email} />
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{prof.position ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {prof.role === 'tenant_admin' ? 'Administrador' : 'Profissional'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: prof.active ? '#dcfce7' : '#f3f4f6', color: prof.active ? '#166534' : '#6b7280', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: prof.active ? '#16a34a' : '#9ca3af', flexShrink: 0 }}/>
                        {prof.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button className="del-btn" onClick={() => handleDelete(prof)} disabled={del.isPending && del.variables === prof.id}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
