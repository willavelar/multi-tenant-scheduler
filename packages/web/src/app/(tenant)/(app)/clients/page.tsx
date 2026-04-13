'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClients } from '@/hooks/useClients'
import { AvatarName } from '@/components/ui/AvatarName'
import { DateTimeCell } from '@/components/ui/DateTimeCell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/providers/AuthProvider'
import type { Client } from '@/types'

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

export default function ClientsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.role === 'tenant_admin'

  const [page, setPage]     = useState(1)
  const [q, setQ]           = useState('')
  const [active, setActive] = useState('')
  const filters = { q: q || undefined, active: active || undefined }
  const { data, isLoading } = useClients(page, filters)

  const clients    = data?.data ?? []
  const total      = data?.total ?? 0
  const limit      = data?.limit ?? 10
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const hasFilters = !!(q || active)

  useEffect(() => { setPage(1) }, [q, active])

  const COLS = ['Cliente', 'Telefone', 'Nascimento', 'Último login', 'Cadastrado em', 'Status', 'Ações']

  return (
    <>
      <style>{`
        .cl-row:hover { background: #f9fafb; }
        .cl-edit-btn { padding: 5px 12px; border: 1px solid #e0e7ff; background: #fff; color: #6366f1; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.12s; font-family: var(--font-inter, Inter, sans-serif); }
        .cl-edit-btn:hover { background: #eef2ff; }
        .filter-input { height: 36px; padding: 0 10px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; color: #111827; background: #fff; outline: none; font-family: var(--font-inter, Inter, sans-serif); transition: border-color 0.15s, box-shadow 0.15s; width: 100%; box-sizing: border-box; }
        .filter-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .filter-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; display: block; }
        .clear-btn { height: 36px; padding: 0 14px; border: 1px solid #e5e7eb; background: #fff; color: #6b7280; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.12s, color 0.12s; font-family: var(--font-inter, Inter, sans-serif); white-space: nowrap; }
        .clear-btn:hover { background: #f3f4f6; color: #374151; }
        .page-btn { display: inline-flex; align-items: center; justify-content: center; padding: 6px 12px; border: 1px solid #e5e7eb; background: #fff; color: #374151; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.12s, border-color 0.12s; font-family: var(--font-inter, Inter, sans-serif); gap: 4px; }
        .page-btn:hover:not(:disabled) { background: #f9fafb; border-color: #d1d5db; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <div style={{ width: '100%' }}>

        {/* Header row */}
        {isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={() => router.push('/clients/new')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter, Inter, sans-serif)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Novo cliente
            </button>
          </div>
        )}

        {/* Filters */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>

            {/* Search */}
            <div style={{ minWidth: 240, flex: '2 1 240px', position: 'relative' }}>
              <label className="filter-label">Busca</label>
              <div style={{ position: 'relative' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Nome ou e-mail…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  style={{ paddingLeft: 30 }}
                />
              </div>
            </div>

            {/* Status */}
            <div style={{ minWidth: 160, flex: '1 1 160px' }}>
              <label className="filter-label">Status</label>
              <select
                className="filter-input"
                value={active}
                onChange={e => setActive(e.target.value)}
                style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30, cursor: 'pointer' }}
              >
                <option value="">Todos</option>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>

            {/* Clear */}
            {hasFilters && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="clear-btn" onClick={() => { setQ(''); setActive('') }}>Limpar filtros</button>
              </div>
            )}
          </div>
        </div>

        {/* Table card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {isLoading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Carregando...</div>
          ) : !clients.length ? (
            <div style={{ padding: '64px 32px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Nenhum cliente</p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                {hasFilters ? 'Nenhum cliente encontrado para os filtros aplicados.' : 'Clientes aparecerão aqui após se cadastrarem.'}
              </p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      {COLS.map((col, i) => (
                        <th key={i} style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          whiteSpace: 'nowrap',
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client: Client) => (
                      <tr key={client.id} className="cl-row" style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.1s' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <AvatarName name={client.name} size={32} />
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>{client.phone ?? '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>{formatBirthDate(client.birthDate)}</td>
                        <td style={{ padding: '12px 16px' }}><DateTimeCell iso={client.lastLoginAt} /></td>
                        <td style={{ padding: '12px 16px' }}><DateTimeCell iso={client.createdAt} /></td>
                        <td style={{ padding: '12px 16px' }}>
                          <ClientStatusBadge active={client.active} />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button className="cl-edit-btn" onClick={() => router.push(`/clients/${client.id}`)}>Visualizar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                  Página {page} de {totalPages}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Anterior
                  </button>
                  <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                    Próxima
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
