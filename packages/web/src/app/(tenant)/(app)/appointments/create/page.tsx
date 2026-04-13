'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfessionals } from '@/hooks/useProfessionals'
import { useServices } from '@/hooks/useServices'
import { useSlots } from '@/hooks/useSlots'
import { useCreateAppointment } from '@/hooks/useAppointments'
import { useClients, useClient, useSearchClients } from '@/hooks/useClients'
import { useAuth } from '@/providers/AuthProvider'
import { BackButton } from '@/components/ui/BackButton'
import { AvatarName } from '@/components/ui/AvatarName'
import type { Professional, Service, ClientDetail } from '@/types'

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Returns active services available to a client profile.
// null profile = no restrictions (return all active).
function getAvailableServices(all: Service[], profile: ClientDetail | null | undefined): Service[] {
  const active = all.filter(s => s.active)
  if (!profile) return active
  if (profile.allServices) return active
  if (profile.linkedServices.length > 0) {
    const ids = new Set(profile.linkedServices.map(s => s.serviceId))
    return active.filter(s => ids.has(s.id))
  }
  return active
}

// Returns active professionals available to a client profile.
function getAvailableProfessionals(all: Professional[], profile: ClientDetail | null | undefined): Professional[] {
  const active = all.filter(p => p.active)
  if (!profile) return active
  if (profile.allProfessionals) return active
  if (profile.linkedProfessionals.length > 0) {
    const ids = new Set(profile.linkedProfessionals.map(p => p.professionalId))
    return active.filter(p => ids.has(p.id))
  }
  return active
}

function Section({ step, current, title, children }: {
  step: number; current: number; title: string; children: React.ReactNode
}) {
  const done   = current > step
  const active = current === step
  const locked = current < step

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${active ? '#6366f1' : '#e5e7eb'}`,
      borderRadius: 12,
      transition: 'border-color 0.2s',
      boxShadow: active ? '0 0 0 3px rgba(99,102,241,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 20px',
        background: locked ? '#fafafa' : '#fff',
        borderBottom: active ? '1px solid #e5e7eb' : 'none',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
          background: done ? '#6366f1' : active ? '#6366f1' : '#e5e7eb',
          color: done || active ? '#fff' : '#9ca3af',
        }}>
          {done
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            : step}
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: locked ? '#9ca3af' : '#111827' }}>
          {title}
        </span>
      </div>

      {active && <div style={{ padding: '20px' }}>{children}</div>}
      {done  && <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{children}</div>}
    </div>
  )
}

function SelectionSummary({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <>
      <span style={{ fontSize: 13.5, color: '#374151', fontWeight: 500 }}>{label}</span>
      <button onClick={onClear} style={{
        fontSize: 12, color: '#6366f1', fontWeight: 600,
        background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px',
        borderRadius: 6, transition: 'background 0.12s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#eef2ff')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        Alterar
      </button>
    </>
  )
}

export default function CreateAppointmentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isAdminOrProfessional = user?.role === 'tenant_admin' || user?.role === 'professional'

  const { data: allProfessionals = [], isLoading: loadingProfs } = useProfessionals()
  const { data: allServices      = [], isLoading: loadingServices } = useServices()

  // Selection state
  const [clientId,     setClientId]     = useState<string | null>(null)
  const [clientName,   setClientName]   = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [serviceId,      setServiceId]      = useState<string | null>(null)
  const [professionalId, setProfessionalId] = useState<string | null>(null)
  const [date,      setDate]      = useState(today())
  const [startTime, setStartTime] = useState<string | null>(null)

  // Client profile for filtering.
  // Admin/prof: load profile of selected client.
  // Client role: load own profile (user.id = client record id).
  const profileId = isAdminOrProfessional ? (clientId ?? '') : (user?.id ?? '')
  const { data: clientProfile, isLoading: loadingProfile } = useClient(profileId)

  // For auto-selecting the only client (admin/prof flow)
  const { data: clientsPage } = useClients(1, {})

  const { data: clientResults = [] } = useSearchClients(clientSearch)
  const { data: slots = [], isLoading: loadingSlots } = useSlots(professionalId, date)
  const create = useCreateAppointment()

  // Derived available lists (apply client restrictions)
  const profileReady = !loadingProfile
  const availableServices      = getAvailableServices(allServices, profileReady ? clientProfile : undefined)
  const availableProfessionals = getAvailableProfessionals(allProfessionals, profileReady ? clientProfile : undefined)

  // ── Auto-select single client (admin/prof) ──
  useEffect(() => {
    if (!isAdminOrProfessional || clientId) return
    if (clientsPage?.total === 1 && clientsPage.data.length === 1) {
      setClientId(clientsPage.data[0].id)
      setClientName(clientsPage.data[0].name)
    }
  }, [clientsPage, clientId, isAdminOrProfessional])

  // ── Auto-select single service ──
  // For admin: trigger after client chosen + profile loaded.
  // For client role: trigger after profile loaded.
  useEffect(() => {
    if (serviceId || !profileReady) return
    if (isAdminOrProfessional && !clientId) return
    if (availableServices.length === 1) setServiceId(availableServices[0].id)
  }, [availableServices, serviceId, clientId, isAdminOrProfessional, profileReady])

  // ── Auto-select single professional ──
  useEffect(() => {
    if (!serviceId || professionalId || !profileReady) return
    if (availableProfessionals.length === 1) setProfessionalId(availableProfessionals[0].id)
  }, [availableProfessionals, serviceId, professionalId, profileReady])

  // Step numbers:
  // admin/prof:   1=Client, 2=Service, 3=Professional, 4=DateTime, 5=Confirm
  // client role:  1=Service, 2=Professional, 3=DateTime, 4=Confirm
  const step = isAdminOrProfessional
    ? (!clientId ? 1 : !serviceId ? 2 : !professionalId ? 3 : !startTime ? 4 : 5)
    : (!serviceId ? 1 : !professionalId ? 2 : !startTime ? 3 : 4)

  const confirmStep = isAdminOrProfessional ? 5 : 4

  const selectedService = allServices.find(s => s.id === serviceId)
  const selectedProf    = allProfessionals.find(p => p.id === professionalId)

  function clearClient() {
    setClientId(null); setClientName(''); setClientSearch('')
    setServiceId(null); setProfessionalId(null); setStartTime(null)
  }
  function clearService() { setServiceId(null); setProfessionalId(null); setStartTime(null) }
  function clearProfessional() { setProfessionalId(null); setStartTime(null) }

  async function handleSubmit() {
    if (!professionalId || !serviceId || !date || !startTime) return
    const body: Parameters<typeof create.mutateAsync>[0] = { professionalId, serviceId, date, startTime }
    if (isAdminOrProfessional && clientId) body.clientId = clientId
    await create.mutateAsync(body)
    router.push('/appointments')
  }

  function selectClient(id: string, name: string) {
    // Clear downstream when client changes
    setServiceId(null); setProfessionalId(null); setStartTime(null)
    setClientId(id); setClientName(name)
    setClientSearch(''); setShowDropdown(false)
  }

  const cardGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 10,
  }
  const card = (selected: boolean): React.CSSProperties => ({
    padding: '12px 14px',
    border: `1.5px solid ${selected ? '#6366f1' : '#e5e7eb'}`,
    borderRadius: 8, cursor: 'pointer',
    background: selected ? '#eef2ff' : '#fff',
    transition: 'border-color 0.15s, background 0.15s',
    textAlign: 'left',
  })

  return (
    <>
      <style>{`
        .appt-card:hover { border-color: #a5b4fc !important; background: #f5f3ff !important; }
        .slot-btn { padding: 8px 14px; border: 1.5px solid #e5e7eb; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; background: #fff; color: #374151; transition: border-color 0.15s, background 0.15s, color 0.15s; font-family: var(--font-inter, Inter, sans-serif); }
        .slot-btn:hover { border-color: #a5b4fc; background: #f5f3ff; color: #4f46e5; }
        .slot-btn.selected { border-color: #6366f1; background: #eef2ff; color: #4f46e5; }
        .submit-btn { width: 100%; height: 44px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s; font-family: var(--font-inter, Inter, sans-serif); display: flex; align-items: center; justify-content: center; gap: 8px; }
        .submit-btn:hover:not(:disabled) { background: #4f46e5; transform: translateY(-1px); }
        .submit-btn:active:not(:disabled) { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .client-input { outline: none; }
        .client-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
        .client-dropdown-item { padding: 9px 14px; cursor: pointer; font-size: 13.5px; color: #111827; border-radius: 6px; transition: background 0.1s; }
        .client-dropdown-item:hover { background: #f5f3ff; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ width: '100%' }}>

        <BackButton href="/appointments" variant="ghost">Voltar para agendamentos</BackButton>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── Step 1 (admin/prof): Cliente ── */}
          {isAdminOrProfessional && (
            <Section step={1} current={step} title="Cliente">
              {step === 1 ? (
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>
                    Busque pelo nome ou e-mail do cliente (mínimo 3 caracteres).
                  </p>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="client-input"
                      type="text"
                      placeholder="Buscar cliente..."
                      value={clientSearch}
                      onChange={e => { setClientSearch(e.target.value); setShowDropdown(true) }}
                      onFocus={() => clientSearch.length >= 3 && setShowDropdown(true)}
                      style={{
                        width: '100%', height: 40, padding: '0 12px',
                        fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 8,
                        background: '#fff', color: '#111827', boxSizing: 'border-box',
                        fontFamily: 'var(--font-inter, Inter, sans-serif)',
                      }}
                    />
                    {showDropdown && clientResults.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)', marginTop: 4, padding: 4,
                      }}>
                        {clientResults.map(c => (
                          <div key={c.id} className="client-dropdown-item" onMouseDown={() => selectClient(c.id, c.name)}>
                            <AvatarName name={c.name} size={28} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : step > 1 ? (
                <SelectionSummary label={clientName} onClear={clearClient} />
              ) : null}
            </Section>
          )}

          {/* ── Step 2 (admin) / 1 (client): Serviço ── */}
          <Section step={isAdminOrProfessional ? 2 : 1} current={step} title="Serviço">
            {step === (isAdminOrProfessional ? 2 : 1) ? (
              loadingServices || (isAdminOrProfessional && loadingProfile && !!clientId) ? (
                <p style={{ fontSize: 13, color: '#9ca3af' }}>Carregando...</p>
              ) : availableServices.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9ca3af' }}>Nenhum serviço disponível para este cliente.</p>
              ) : (
                <div style={cardGrid}>
                  {availableServices.map((svc: Service) => (
                    <button key={svc.id} className="appt-card" style={card(serviceId === svc.id)} onClick={() => setServiceId(svc.id)}>
                      <p style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{svc.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{svc.durationMinutes} min</p>
                      {svc.description && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>{svc.description}</p>}
                    </button>
                  ))}
                </div>
              )
            ) : step > (isAdminOrProfessional ? 2 : 1) ? (
              <SelectionSummary
                label={`${selectedService?.name} · ${selectedService?.durationMinutes} min`}
                onClear={clearService}
              />
            ) : null}
          </Section>

          {/* ── Step 3 (admin) / 2 (client): Profissional ── */}
          <Section step={isAdminOrProfessional ? 3 : 2} current={step} title="Profissional">
            {step === (isAdminOrProfessional ? 3 : 2) ? (
              loadingProfs || (isAdminOrProfessional && loadingProfile && !!clientId) ? (
                <p style={{ fontSize: 13, color: '#9ca3af' }}>Carregando...</p>
              ) : availableProfessionals.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9ca3af' }}>Nenhum profissional disponível para este cliente.</p>
              ) : (
                <div style={cardGrid}>
                  {availableProfessionals.map((prof: Professional) => (
                    <button key={prof.id} className="appt-card" style={card(professionalId === prof.id)} onClick={() => setProfessionalId(prof.id)}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: '#6366f1', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, marginBottom: 8,
                      }}>
                        {prof.name.slice(0, 2).toUpperCase()}
                      </div>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{prof.name}</p>
                      {prof.position && <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>{prof.position}</p>}
                    </button>
                  ))}
                </div>
              )
            ) : step > (isAdminOrProfessional ? 3 : 2) ? (
              <SelectionSummary label={selectedProf?.name ?? ''} onClear={clearProfessional} />
            ) : null}
          </Section>

          {/* ── Step 4 (admin) / 3 (client): Data e horário ── */}
          <Section step={isAdminOrProfessional ? 4 : 3} current={step} title="Data e horário">
            {step === (isAdminOrProfessional ? 4 : 3) ? (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Data
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={today()}
                    onChange={e => { setDate(e.target.value); setStartTime(null) }}
                    style={{
                      height: 40, padding: '0 12px', fontSize: 14,
                      border: '1.5px solid #e5e7eb', borderRadius: 8,
                      outline: 'none', background: '#fff', color: '#111827',
                      fontFamily: 'var(--font-inter, Inter, sans-serif)', cursor: 'pointer',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Horários disponíveis
                  </label>
                  {loadingSlots ? (
                    <p style={{ fontSize: 13, color: '#9ca3af' }}>Carregando horários...</p>
                  ) : slots.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#9ca3af' }}>Nenhum horário disponível para esta data.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {slots.map((slot: string) => (
                        <button key={slot} className={`slot-btn${startTime === slot ? ' selected' : ''}`} onClick={() => setStartTime(slot)}>
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : step > (isAdminOrProfessional ? 4 : 3) ? (
              <SelectionSummary
                label={`${new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às ${startTime}`}
                onClear={() => setStartTime(null)}
              />
            ) : null}
          </Section>

          {/* ── Step 5 (admin) / 4 (client): Confirmar ── */}
          <Section step={confirmStep} current={step} title="Confirmar agendamento">
            {step === confirmStep && (
              <div>
                <div style={{
                  background: '#f9fafb', borderRadius: 8, padding: '14px 16px',
                  marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  {[
                    ...(isAdminOrProfessional ? [{ label: 'Cliente', value: clientName }] : []),
                    { label: 'Serviço',      value: `${selectedService?.name} · ${selectedService?.durationMinutes} min` },
                    { label: 'Profissional', value: selectedProf?.name },
                    { label: 'Data',         value: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) },
                    { label: 'Horário',      value: startTime },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                      <span style={{ color: '#6b7280' }}>{label}</span>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {create.isError && (
                  <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 14 }}>
                    Horário indisponível. Escolha outro horário.
                  </p>
                )}

                <button className="submit-btn" onClick={handleSubmit} disabled={create.isPending}>
                  {create.isPending ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.75s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Confirmando...
                    </>
                  ) : 'Confirmar agendamento'}
                </button>
              </div>
            )}
          </Section>

        </div>
      </div>
    </>
  )
}
