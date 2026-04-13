'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAppointments, useCancelAppointment } from '@/hooks/useAppointments'
import { useSearchClients } from '@/hooks/useClients'
import { useServices } from '@/hooks/useServices'
import { AvatarName } from '@/components/ui/AvatarName'
import { DateTimeCell } from '@/components/ui/DateTimeCell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Appointment } from '@/types'

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending:   'Agendado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Pago',
}

const STATUS_COLORS: Record<Appointment['status'], { bg: string; text: string; dot: string }> = {
  pending:   { bg: '#fef9c3', text: '#854d0e', dot: '#ca8a04' },
  confirmed: { bg: '#dcfce7', text: '#166534', dot: '#16a34a' },
  cancelled: { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626' },
  completed: { bg: '#ede9fe', text: '#5b21b6', dot: '#7c3aed' },
}

// Mask dd/mm/yyyy as the user types
function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

// Convert dd/mm/yyyy → yyyy-mm-dd for the API (returns '' if incomplete/invalid)
function toIso(masked: string): string {
  const m = masked.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return ''
  const [, d, mo, y] = m
  const date = new Date(`${y}-${mo}-${d}`)
  if (isNaN(date.getTime())) return ''
  return `${y}-${mo}-${d}`
}

export default function AppointmentsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [cancelId, setCancelId] = useState<string | null>(null)

  // Filters
  const [dateFromMask, setDateFromMask] = useState('')  // display: dd/mm/yyyy
  const [dateToMask,   setDateToMask]   = useState('')  // display: dd/mm/yyyy
  const [dateFrom,     setDateFrom]     = useState('')  // API: yyyy-mm-dd
  const [dateTo,       setDateTo]       = useState('')  // API: yyyy-mm-dd
  const [serviceId,    setServiceId]    = useState('')
  const [status,       setStatus]       = useState('')
  const [clientId,     setClientId]     = useState('')

  // Client autocomplete
  const [clientQuery,        setClientQuery]        = useState('')
  const [clientDisplayValue, setClientDisplayValue] = useState('')
  const [clientDropOpen,     setClientDropOpen]     = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)

  const { data: clientResults = [], isFetching: searchingClients } = useSearchClients(clientQuery)
  const { data: servicesList = [] } = useServices()

  const filters = { dateFrom, dateTo, serviceId, status, clientId }
  const { data, isLoading } = useAppointments(page, filters)
  const cancel = useCancelAppointment()

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [dateFrom, dateTo, serviceId, status, clientId])

  // Close client dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setClientDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const appointments = data?.data ?? []
  const total = data?.total ?? 0
  const limit = data?.limit ?? 10
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const hasFilters = !!(dateFrom || dateTo || serviceId || status || clientId)

  function clearFilters() {
    setDateFromMask(''); setDateToMask('')
    setDateFrom('');     setDateTo('')
    setServiceId('');    setStatus('');    setClientId('')
    setClientQuery('');  setClientDisplayValue('')
  }

  function selectClient(id: string, name: string) {
    setClientId(id)
    setClientDisplayValue(name)
    setClientQuery('')
    setClientDropOpen(false)
  }

  function handleClientInput(value: string) {
    setClientDisplayValue(value)
    if (clientId) { setClientId(''); }
    setClientQuery(value)
    setClientDropOpen(value.length >= 3)
  }

  function confirmCancel() {
    if (!cancelId) return
    cancel.mutate(cancelId, { onSuccess: () => setCancelId(null) })
  }

  return (
    <>
      <style>{`
        .appt-row:hover { background: #f9fafb; }
        .cancel-btn {
          padding: 5px 12px;
          border: 1px solid #fecaca;
          background: #fff;
          color: #dc2626;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.12s;
          font-family: var(--font-inter, Inter, sans-serif);
        }
        .cancel-btn:hover { background: #fef2f2; }
        .cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .new-appt-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px;
          background: #6366f1;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          font-family: var(--font-inter, Inter, sans-serif);
        }
        .new-appt-btn:hover { background: #4f46e5; transform: translateY(-1px); }
        .page-btn {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 6px 12px;
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #374151;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s;
          font-family: var(--font-inter, Inter, sans-serif);
          gap: 4px;
        }
        .page-btn:hover:not(:disabled) { background: #f9fafb; border-color: #d1d5db; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .filter-input {
          height: 36px;
          padding: 0 10px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 13px;
          color: #111827;
          background: #fff;
          outline: none;
          font-family: var(--font-inter, Inter, sans-serif);
          transition: border-color 0.15s, box-shadow 0.15s;
          width: 100%;
          box-sizing: border-box;
        }
        .filter-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .filter-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; display: block; }
        .clear-btn { height: 36px; padding: 0 14px; border: 1px solid #e5e7eb; background: #fff; color: #6b7280; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.12s, color 0.12s; font-family: var(--font-inter, Inter, sans-serif); white-space: nowrap; }
        .clear-btn:hover { background: #f3f4f6; color: #374151; }
        .client-result { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; transition: background 0.1s; border: none; background: none; width: 100%; text-align: left; font-family: var(--font-inter, Inter, sans-serif); }
        .client-result:hover { background: #f9fafb; }
      `}</style>

      <div>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="new-appt-btn" onClick={() => router.push('/appointments/create')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo agendamento
          </button>
        </div>

        {/* Filters */}
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>

            {/* Date From */}
            <div style={{ minWidth: 140, flex: '1 1 140px' }}>
              <label className="filter-label">De</label>
              <input
                type="text"
                className="filter-input"
                placeholder="dd/mm/aaaa"
                value={dateFromMask}
                onChange={e => {
                  const masked = applyDateMask(e.target.value)
                  setDateFromMask(masked)
                  setDateFrom(toIso(masked))
                }}
                maxLength={10}
              />
            </div>

            {/* Date To */}
            <div style={{ minWidth: 140, flex: '1 1 140px' }}>
              <label className="filter-label">Até</label>
              <input
                type="text"
                className="filter-input"
                placeholder="dd/mm/aaaa"
                value={dateToMask}
                onChange={e => {
                  const masked = applyDateMask(e.target.value)
                  setDateToMask(masked)
                  setDateTo(toIso(masked))
                }}
                maxLength={10}
              />
            </div>

            {/* Service */}
            <div style={{ minWidth: 160, flex: '1 1 160px' }}>
              <label className="filter-label">Serviço</label>
              <select
                className="filter-input"
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
                style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30 }}
              >
                <option value="">Todos</option>
                {servicesList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div style={{ minWidth: 140, flex: '1 1 140px' }}>
              <label className="filter-label">Status</label>
              <select
                className="filter-input"
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30 }}
              >
                <option value="">Todos</option>
                <option value="pending">Agendado</option>
                <option value="confirmed">Confirmado</option>
                <option value="cancelled">Cancelado</option>
                <option value="completed">Pago</option>
              </select>
            </div>

            {/* Client search */}
            <div style={{ minWidth: 200, flex: '2 1 200px', position: 'relative' }} ref={clientRef}>
              <label className="filter-label">Cliente</label>
              <div style={{ position: 'relative' }}>
                <svg
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                >
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Buscar por nome ou e-mail…"
                  value={clientDisplayValue}
                  onChange={e => handleClientInput(e.target.value)}
                  onFocus={() => { if (clientQuery.length >= 3) setClientDropOpen(true) }}
                  style={{ paddingLeft: 30, paddingRight: clientId ? 30 : 10 }}
                />
                {clientId && (
                  <button
                    onClick={() => { setClientId(''); setClientDisplayValue(''); setClientQuery('') }}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {clientDropOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0, right: 0,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                  zIndex: 40,
                  overflow: 'hidden',
                  maxHeight: 240,
                  overflowY: 'auto',
                }}>
                  {searchingClients ? (
                    <p style={{ padding: '10px 12px', fontSize: 13, color: '#9ca3af', margin: 0 }}>Buscando...</p>
                  ) : clientResults.length === 0 ? (
                    <p style={{ padding: '10px 12px', fontSize: 13, color: '#9ca3af', margin: 0 }}>Nenhum cliente encontrado</p>
                  ) : clientResults.map(c => (
                    <button key={c.id} className="client-result" onClick={() => selectClient(c.id, c.name)}>
                      <AvatarName name={c.name} subtitle={c.email} size={28} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear */}
            {hasFilters && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="clear-btn" onClick={clearFilters}>Limpar filtros</button>
              </div>
            )}
          </div>
        </div>

        {/* Table card */}
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          {isLoading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              Carregando...
            </div>
          ) : !appointments.length ? (
            <div style={{ padding: '64px 32px', textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Nenhum agendamento</p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Clique em &quot;Novo agendamento&quot; para começar.</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      {['Agendado em', 'Cliente', 'Profissional', 'Serviço', 'Status', 'Cadastrado em', 'Ação'].map(col => (
                        <th key={col} style={{
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
                    {appointments.map((appt: Appointment) => {
                      const colors = STATUS_COLORS[appt.status]
                      return (
                        <tr key={appt.id} className="appt-row" style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.1s' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <DateTimeCell iso={appt.startsAt} />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <AvatarName name={appt.clientName} />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <AvatarName name={appt.professionalName} />
                          </td>
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', color: '#6b7280' }}>
                            {appt.serviceName}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <StatusBadge
                              label={STATUS_LABELS[appt.status]}
                              bg={colors.bg}
                              color={colors.text}
                              dot={colors.dot}
                            />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <DateTimeCell iso={appt.createdAt} />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {(appt.status === 'pending' || appt.status === 'confirmed') && (
                              <button
                                className="cancel-btn"
                                onClick={() => setCancelId(appt.id)}
                              >
                                Cancelar
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderTop: '1px solid #f3f4f6',
              }}>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                  Página {page} de {totalPages}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="page-btn"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page <= 1}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    Anterior
                  </button>
                  <button
                    className="page-btn"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages}
                  >
                    Próxima
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Cancel confirmation modal */}
      {cancelId && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50,
            animation: 'modal-fade 0.15s ease both',
          }}
          onClick={() => !cancel.isPending && setCancelId(null)}
        >
          <style>{`
            @keyframes modal-fade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modal-slide { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
          `}</style>
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '28px 28px 24px',
              width: '100%',
              maxWidth: 400,
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              animation: 'modal-slide 0.18s cubic-bezier(0.22,1,0.36,1) both',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>

            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              Cancelar agendamento
            </h2>
            <p style={{ fontSize: 13.5, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.5 }}>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCancelId(null)}
                disabled={cancel.isPending}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  color: '#374151',
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter, Inter, sans-serif)',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                Voltar
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancel.isPending}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: cancel.isPending ? 'not-allowed' : 'pointer',
                  opacity: cancel.isPending ? 0.7 : 1,
                  fontFamily: 'var(--font-inter, Inter, sans-serif)',
                  transition: 'background 0.12s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => { if (!cancel.isPending) e.currentTarget.style.background = '#b91c1c' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#dc2626' }}
              >
                {cancel.isPending ? 'Cancelando...' : 'Sim, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
