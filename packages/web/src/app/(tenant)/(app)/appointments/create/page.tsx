'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfessionals } from '@/hooks/useProfessionals'
import { useServices } from '@/hooks/useServices'
import { useSlots } from '@/hooks/useSlots'
import { useCreateAppointment } from '@/hooks/useAppointments'
import { useClients, useClient } from '@/hooks/useClients'
import { useLimitCheck } from '@/hooks/useLimitCheck'
import { useAuth } from '@/providers/AuthProvider'
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
import { useFormatTime } from '@/hooks/useFormatTime'
import { BackButton } from '@/components/ui/BackButton'
import { DatePickerField } from '@/components/ui/DatePickerField'
import { ClientSearchField } from '@/components/ui/ClientSearchField'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
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
    <div className={cn(
      'bg-card border transition-colors',
      active ? 'border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.10)]' : 'border-border shadow-sm',
      'rounded-xl',
    )}>
      <div className={cn(
        'flex items-center gap-3 px-5 py-3.5 transition-colors',
        locked ? 'bg-muted' : 'bg-card',
        active ? 'border-b border-border' : '',
        locked ? 'rounded-xl' : 'rounded-t-xl',
      )}>
        <div className={cn(
          'w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center text-xs font-bold',
          done || active ? 'bg-indigo-500 text-white' : 'bg-muted text-muted-foreground',
        )}
        >
          {done
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            : step}
        </div>
        <span className={cn('text-sm font-semibold', locked ? 'text-muted-foreground' : 'text-foreground')}>
          {title}
        </span>
      </div>

      {active && <div className="p-5">{children}</div>}
      {done  && <div className="px-5 py-3 flex items-center justify-between">{children}</div>}
    </div>
  )
}

function SelectionSummary({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <>
      <span className="text-[13.5px] text-foreground font-medium">{label}</span>
      <button
        onClick={onClear}
        className="text-xs text-indigo-500 font-semibold bg-transparent border-none cursor-pointer px-2 py-0.5 rounded-md transition-colors hover:bg-indigo-500/10"
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
  const { confirmationMode } = useTenantSettingsContext()
  const showStatusPicker = isAdminOrProfessional && confirmationMode === 'manual'
  const [initialStatus, setInitialStatus] = useState<'pending' | 'confirmed'>('pending')

  const { formatTime } = useFormatTime()

  const { data: allProfessionals = [], isLoading: loadingProfs } = useProfessionals()
  const { data: allServices      = [], isLoading: loadingServices } = useServices()

  // Selection state
  const [clientId,     setClientId]     = useState<string | null>(null)
  const [clientName,   setClientName]   = useState('')
  const [clientSearch, setClientSearch] = useState('')
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

  const { data: slots = [], isLoading: loadingSlots } = useSlots(professionalId, date)
  const create = useCreateAppointment()

  const limitClientId = isAdminOrProfessional ? clientId : (user?.id ?? null)
  const { data: limitCheck } = useLimitCheck(serviceId, date, limitClientId)
  const limitExceeded = limitCheck?.exceeded === true

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
    if (showStatusPicker) body.initialStatus = initialStatus
    await create.mutateAsync(body)
    router.push('/appointments')
  }

  function selectClient(id: string, name: string) {
    setServiceId(null); setProfessionalId(null); setStartTime(null)
    setClientId(id); setClientName(name)
    setClientSearch('')
  }

  return (
    <div className="w-full">

      <BackButton href="/appointments" variant="ghost">Voltar para agendamentos</BackButton>

      <div className="flex flex-col gap-3">

        {/* ── Step 1 (admin/prof): Cliente ── */}
        {isAdminOrProfessional && (
          <Section step={1} current={step} title="Cliente">
            {step === 1 ? (
              <div>
                <p className="text-[13px] text-muted-foreground mb-3">
                  Busque pelo nome ou e-mail do cliente (mínimo 3 caracteres).
                </p>
                <ClientSearchField
                  value={clientSearch}
                  onChange={setClientSearch}
                  onSelect={selectClient}
                  placeholder="Buscar cliente..."
                  inputClassName="h-10 text-[13px] border-[1.5px] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] focus:ring-0"
                />
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
              <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-3.5 py-3 border border-border rounded-lg">
                    <Skeleton className="h-4 w-3/4 mb-1.5" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            ) : availableServices.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Nenhum serviço disponível para este cliente.</p>
            ) : (
              <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {availableServices.map((svc: Service) => (
                  <button
                    key={svc.id}
                    onClick={() => setServiceId(svc.id)}
                    className={cn(
                      'px-3.5 py-3 border-[1.5px] rounded-lg cursor-pointer text-left transition-[border-color,background] hover:border-indigo-400 hover:bg-indigo-500/10',
                      serviceId === svc.id ? 'border-indigo-500 bg-indigo-500/15' : 'border-border bg-card',
                    )}
                  >
                    <p className="m-0 mb-1 text-[13.5px] font-semibold text-foreground">{svc.name}</p>
                    <p className="m-0 text-xs text-muted-foreground">{svc.durationMinutes} min</p>
                    {svc.description && <p className="mt-1 m-0 text-xs text-muted-foreground">{svc.description}</p>}
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
              <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-3.5 py-3 border border-border rounded-lg">
                    <Skeleton className="h-9 w-9 rounded-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : availableProfessionals.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Nenhum profissional disponível para este cliente.</p>
            ) : (
              <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {availableProfessionals.map((prof: Professional) => (
                  <button
                    key={prof.id}
                    onClick={() => setProfessionalId(prof.id)}
                    className={cn(
                      'px-3.5 py-3 border-[1.5px] rounded-lg cursor-pointer text-left transition-[border-color,background] hover:border-indigo-400 hover:bg-indigo-500/10',
                      professionalId === prof.id ? 'border-indigo-500 bg-indigo-500/15' : 'border-border bg-card',
                    )}
                  >
                    {prof.avatarUrl ? (
                      <img src={prof.avatarUrl} alt={prof.name} className="w-9 h-9 rounded-full object-cover mb-2" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[13px] font-bold mb-2">
                        {prof.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <p className="m-0 text-[13.5px] font-semibold text-foreground">{prof.name}</p>
                    {prof.position && <p className="mt-0.5 m-0 text-xs text-muted-foreground">{prof.position}</p>}
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
              <div className="mb-5">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-[0.06em]">
                  Data
                </label>
                <DatePickerField
                  value={date}
                  onChange={iso => { if (iso) { setDate(iso); setStartTime(null) } }}
                  min={new Date(today() + 'T00:00:00')}
                  className="max-w-[200px]"
                  inputClassName="h-10 border-[1.5px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-[0.06em]">
                  Horários disponíveis
                </label>
                {loadingSlots ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-16 rounded-lg" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">Nenhum horário disponível para esta data.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot: string) => (
                      <button
                        key={slot}
                        onClick={() => { if (!limitExceeded) setStartTime(slot) }}
                        className={cn(
                          'px-3.5 py-2 border-[1.5px] rounded-lg text-[13px] font-semibold transition-[border-color,background,color]',
                          limitExceeded && startTime !== slot
                            ? 'border-border bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                            : startTime === slot
                              ? 'border-indigo-500 bg-indigo-500/15 text-indigo-500 cursor-pointer'
                              : 'border-border bg-card text-foreground cursor-pointer hover:border-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-500',
                        )}
                      >
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
                {limitExceeded && (
                  <p className="mt-3 text-[13px] text-red-600 font-medium">
                    Não é possivel agendar nessa data pelo seu limite de agendamentos
                  </p>
                )}
              </div>
            </div>
          ) : step > (isAdminOrProfessional ? 4 : 3) ? (
            <SelectionSummary
              label={`${new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às ${formatTime(startTime!)}`}
              onClear={() => setStartTime(null)}
            />
          ) : null}
        </Section>

        {/* ── Step 5 (admin) / 4 (client): Confirmar ── */}
        <Section step={confirmStep} current={step} title="Confirmar agendamento">
          {step === confirmStep && (
            <div>
              <div className="bg-muted rounded-lg px-4 py-3.5 mb-5 flex flex-col gap-2">
                {[
                  ...(isAdminOrProfessional ? [{ label: 'Cliente', value: clientName }] : []),
                  { label: 'Serviço',      value: `${selectedService?.name} · ${selectedService?.durationMinutes} min` },
                  { label: 'Profissional', value: selectedProf?.name },
                  { label: 'Data',         value: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) },
                  { label: 'Horário',      value: startTime ? formatTime(startTime) : '' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-[13.5px]">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>

              {showStatusPicker && (
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-[0.06em]">
                    Status inicial
                  </label>
                  <div className="flex gap-2">
                    {(['pending', 'confirmed'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInitialStatus(s)}
                        className={cn(
                          'px-3.5 py-2.5 border-[1.5px] rounded-lg cursor-pointer text-[13px] font-semibold transition-[border-color,background,color]',
                          initialStatus === s
                            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-500'
                            : 'border-border bg-card text-foreground hover:border-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-500',
                        )}
                      >
                        {s === 'pending' ? 'Aguardando confirmação' : 'Confirmado'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {create.isError && (
                <p className="text-[13px] text-red-600 mb-3.5">
                  Horário indisponível. Escolha outro horário.
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={create.isPending}
                className="w-full h-11 bg-indigo-500 text-white border-0 rounded-lg text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-[background,transform] hover:enabled:bg-indigo-600 hover:enabled:-translate-y-px active:enabled:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {create.isPending ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
  )
}
