'use client'

import { useState, useRef, useEffect } from 'react'
import { useProfessionals } from '@/hooks/useProfessionals'
import { useServices } from '@/hooks/useServices'
import { AvatarCropField } from '@/components/ui/AvatarCropField'
import { AvatarName } from '@/components/ui/AvatarName'
import { DatePickerField } from '@/components/ui/DatePickerField'
import { PreferencesCard } from '@/components/ui/PreferencesCard'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FormSkeleton } from '@/components/ui/FormSkeleton'
import type { Professional, Service, ClientDetail } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClientFormData = {
  name: string
  email: string
  password?: string
  sendInvite?: boolean
  phone?: string
  birthDate?: string
  notes?: string
  active: boolean
  avatarUrl?: string
  timezone: string
  timeFormat: '12h' | '24h'
  allProfessionals: boolean
  allServices: boolean
  professionalIds: string[]
  serviceIds: string[]
  serviceLimitCount?: number | null
  serviceLimitPeriod?: 'day' | 'week' | 'month' | null
  serviceLimits?: { serviceId: string; limitCount: number; limitPeriod: 'day' | 'week' | 'month' }[]
  cancellationLimitCount?: number | null
  cancellationLimitPeriod?: 'day' | 'week' | 'month' | null
}

export type ClientFormProps = {
  mode: 'create' | 'edit'
  defaultValues?: ClientDetail
  onSubmit: (data: ClientFormData) => Promise<void>
  onCancel: () => void
  isOwnProfile?: boolean
}

type FormState = {
  name: string
  email: string
  password: string
  phone: string
  birthDate: string
  notes: string
  active: boolean
  serviceLimitCount: string
  serviceLimitPeriod: string
  cancellationLimitCount: string
  cancellationLimitPeriod: string
}

type LimitMode = 'none' | 'normal' | 'per_service'
type PerServiceLimitMap = Record<string, { count: string; period: string }>

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

const inputCls = (hasError = false) => cn(
  'w-full h-[42px] px-3 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
  hasError ? 'border-red-400' : 'border-border',
)

// ── Component ─────────────────────────────────────────────────────────────────

export function ClientForm({ mode, defaultValues, onSubmit, onCancel, isOwnProfile }: ClientFormProps) {
  const { data: allProfessionals = [], isSuccess: profsReady } = useProfessionals()
  const { data: services = [] } = useServices()

  const [initialized, setInitialized] = useState(mode === 'create')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [timezone,   setTimezone]   = useState(defaultValues?.timezone   ?? 'America/Sao_Paulo')
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(defaultValues?.timeFormat ?? '24h')

  const [form, setForm] = useState<FormState>({
    name: '', email: '', password: '', phone: '',
    birthDate: '', notes: '', active: true,
    serviceLimitCount: '', serviceLimitPeriod: '',
    cancellationLimitCount: '',
    cancellationLimitPeriod: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'root', string>>>({})

  const [allProfs, setAllProfs] = useState(true)
  const [selectedProfs, setSelectedProfs] = useState<Professional[]>([])
  const [profSearch, setProfSearch] = useState('')
  const [showProfDrop, setShowProfDrop] = useState(false)
  const profRef = useRef<HTMLDivElement>(null)

  const [allSvcs, setAllSvcs] = useState(true)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  const [limitMode, setLimitMode] = useState<LimitMode>('none')
  const [perServiceLimits, setPerServiceLimits] = useState<PerServiceLimitMap>({})
  const [sendInvite, setSendInvite] = useState(mode === 'create')

  // Initialize edit form once both defaultValues and allProfessionals are ready
  useEffect(() => {
    if (mode !== 'edit' || !defaultValues || initialized || !profsReady) return
    setForm({
      name:               defaultValues.name,
      email:              defaultValues.email,
      password:           '',
      phone:              applyPhoneMask(defaultValues.phone ?? ''),
      birthDate:          defaultValues.birthDate ?? '',
      notes:              defaultValues.notes ?? '',
      active:             defaultValues.active !== false,
      serviceLimitCount:  defaultValues.serviceLimitCount != null
                            ? String(defaultValues.serviceLimitCount) : '',
      serviceLimitPeriod: defaultValues.serviceLimitPeriod ?? '',
      cancellationLimitCount:  defaultValues.cancellationLimitCount != null
                                 ? String(defaultValues.cancellationLimitCount) : '',
      cancellationLimitPeriod: defaultValues.cancellationLimitPeriod ?? '',
    })
    setAvatarUrl(defaultValues.avatarUrl ?? null)
    setTimezone(defaultValues.timezone ?? 'America/Sao_Paulo')
    setTimeFormat(defaultValues.timeFormat ?? '24h')
    setAllProfs(defaultValues.allProfessionals === true)
    setAllSvcs(defaultValues.allServices === true)
    setSelectedProfs(
      defaultValues.linkedProfessionals
        .map(lp => allProfessionals.find(p => p.id === lp.professionalId))
        .filter(Boolean) as Professional[]
    )
    setSelectedServiceIds(defaultValues.linkedServices.map(s => s.serviceId))
    if (defaultValues.serviceLimitCount != null && defaultValues.serviceLimitPeriod) {
      setLimitMode('normal')
    } else if (defaultValues.perServiceLimits?.length) {
      setLimitMode('per_service')
      const map: PerServiceLimitMap = {}
      defaultValues.perServiceLimits.forEach(sl => {
        map[sl.serviceId] = { count: String(sl.limitCount), period: sl.limitPeriod }
      })
      setPerServiceLimits(map)
    } else {
      setLimitMode('none')
    }
    setInitialized(true)
  }, [mode, defaultValues, allProfessionals, profsReady, initialized])

  // Close professional dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (profRef.current && !profRef.current.contains(e.target as Node)) {
        setShowProfDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!initialized) return <FormSkeleton />

  const set = (k: keyof FormState, v: string | boolean) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  const filteredProfs = allProfessionals.filter(p =>
    !selectedProfs.find(s => s.id === p.id) &&
    (p.name.toLowerCase().includes(profSearch.toLowerCase()) ||
     p.email.toLowerCase().includes(profSearch.toLowerCase()))
  )

  function addProf(p: Professional) {
    setSelectedProfs(prev => [...prev, p])
    setProfSearch('')
    setShowProfDrop(false)
  }

  function removeProf(id: string) {
    setSelectedProfs(prev => prev.filter(p => p.id !== id))
  }

  function toggleService(id: string) {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState | 'root', string>> = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (!form.email.trim()) e.email = 'E-mail obrigatório'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido'
    if (mode === 'create' && !sendInvite) {
      if (!form.password) e.password = 'Senha obrigatória'
      else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    }
    if (limitMode === 'normal') {
      if (form.serviceLimitCount && isNaN(Number(form.serviceLimitCount))) {
        e.serviceLimitCount = 'Valor inválido'
      }
      if (form.serviceLimitCount && !form.serviceLimitPeriod) {
        e.serviceLimitPeriod = 'Selecione o período'
      }
      if (!form.serviceLimitCount && form.serviceLimitPeriod) {
        e.serviceLimitCount = 'Informe a quantidade'
      }
    }
    if (limitMode === 'per_service' && !allSvcs && selectedServiceIds.length === 0) {
      e.root = 'Para usar limites por serviço, selecione serviços específicos em "Serviços permitidos".'
    }
    if (form.cancellationLimitCount && isNaN(Number(form.cancellationLimitCount))) {
      e.cancellationLimitCount = 'Valor inválido'
    }
    if (form.cancellationLimitCount && !form.cancellationLimitPeriod) {
      e.cancellationLimitPeriod = 'Selecione o período'
    }
    if (!form.cancellationLimitCount && form.cancellationLimitPeriod) {
      e.cancellationLimitCount = 'Informe a quantidade'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const data: ClientFormData = {
        name:             form.name.trim(),
        email:            form.email.trim(),
        ...(mode === 'create' ? { password: sendInvite ? undefined : form.password, sendInvite } : {}),
        phone:            form.phone.trim() || undefined,
        birthDate:        form.birthDate || undefined,
        notes:            form.notes.trim() || undefined,
        active:           form.active,
        avatarUrl:        avatarUrl ?? undefined,
        timezone,
        timeFormat,
        allProfessionals: allProfs,
        allServices:      allSvcs,
        professionalIds:  allProfs ? [] : selectedProfs.map(p => p.id),
        serviceIds:       allSvcs ? [] : selectedServiceIds,
        serviceLimitCount:  limitMode === 'normal' && form.serviceLimitCount
          ? Number(form.serviceLimitCount) : null,
        serviceLimitPeriod: limitMode === 'normal' && form.serviceLimitPeriod
          ? form.serviceLimitPeriod as 'day' | 'week' | 'month' : null,
        serviceLimits: limitMode === 'per_service'
          ? (allSvcs ? services.map((s: Service) => s.id) : selectedServiceIds)
              .filter(id => perServiceLimits[id]?.count && perServiceLimits[id]?.period)
              .map(id => ({
                serviceId:   id,
                limitCount:  Number(perServiceLimits[id].count),
                limitPeriod: perServiceLimits[id].period as 'day' | 'week' | 'month',
              }))
          : [],
        cancellationLimitCount:  form.cancellationLimitCount
          ? Number(form.cancellationLimitCount) : null,
        cancellationLimitPeriod: form.cancellationLimitPeriod
          ? form.cancellationLimitPeriod as 'day' | 'week' | 'month' : null,
      }
      await onSubmit(data)
    } catch {
      setErrors(e => ({ ...e, root: mode === 'create'
        ? 'Não foi possível cadastrar o cliente. Verifique os dados e tente novamente.'
        : 'Não foi possível salvar as alterações. Verifique os dados e tente novamente.',
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const showStatus = mode === 'edit' && !isOwnProfile

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── Card 1: Dados pessoais ── */}
      <div className="bg-card border border-border rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-foreground m-0 mb-5">Dados pessoais</p>

        <div className="mb-5">
          <AvatarCropField value={avatarUrl} onChange={setAvatarUrl} name={form.name} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="client-name" className="block text-[13px] font-medium text-foreground mb-1.5">
              Nome completo <span className="text-red-400">*</span>
            </label>
            <input
              id="client-name"
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={inputCls(!!errors.name)}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1 m-0">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="client-email" className="block text-[13px] font-medium text-foreground mb-1.5">
              E-mail <span className="text-red-400">*</span>
            </label>
            <input
              id="client-email"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className={inputCls(!!errors.email)}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1 m-0">{errors.email}</p>}
          </div>
          {mode === 'create' && (
            <>
              <div className="col-span-2 flex items-center gap-2.5 mt-1 mb-1">
                <input
                  id="client-send-invite"
                  type="checkbox"
                  checked={sendInvite}
                  onChange={e => setSendInvite(e.target.checked)}
                  className="w-4 h-4 rounded border-border cursor-pointer accent-indigo-500"
                />
                <label htmlFor="client-send-invite" className="text-[13px] font-medium text-foreground cursor-pointer select-none">
                  Enviar convite por e-mail para o usuário cadastrar a senha
                </label>
              </div>
              {!sendInvite && (
                <div>
                  <label htmlFor="client-password" className="block text-[13px] font-medium text-foreground mb-1.5">
                    Senha inicial <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="client-password"
                    type="password"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    className={inputCls(!!errors.password)}
                  />
                  {errors.password && <p className="text-xs text-red-500 mt-1 m-0">{errors.password}</p>}
                </div>
              )}
            </>
          )}
          <div>
            <label htmlFor="client-phone" className="block text-[13px] font-medium text-foreground mb-1.5">
              Telefone
            </label>
            <input
              id="client-phone"
              type="tel"
              value={form.phone}
              onChange={e => set('phone', applyPhoneMask(e.target.value))}
              className={inputCls(!!errors.phone)}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-[13px] font-medium text-foreground mb-1.5">Data de nascimento</label>
          <DatePickerField
            value={form.birthDate}
            onChange={iso => set('birthDate', iso)}
            className="max-w-[220px]"
          />
        </div>
      </div>

      {/* ── Card 2: Perfil ── */}
      <div className="bg-card border border-border rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-foreground m-0 mb-5">Perfil</p>

        <div className="mb-4">
          <label htmlFor="client-notes" className="block text-[13px] font-medium text-foreground mb-1.5">Observações</label>
          <textarea
            id="client-notes"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 text-sm text-foreground bg-background rounded-lg border border-border outline-none resize-y transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {showStatus && (
          <div>
            <label htmlFor="client-active" className="block text-[13px] font-medium text-foreground mb-1.5">Status</label>
            <div className="relative max-w-[180px]">
              <select
                id="client-active"
                value={form.active ? 'true' : 'false'}
                onChange={e => set('active', e.target.value === 'true')}
                className="w-full h-[42px] pl-3 pr-8 text-sm text-foreground bg-background rounded-lg border border-border appearance-none cursor-pointer outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* ── Card 3: Preferências ── */}
      <PreferencesCard
        timezone={timezone}
        timeFormat={timeFormat}
        onTimezoneChange={setTimezone}
        onTimeFormatChange={setTimeFormat}
      />

      {/* ── Card 4: Profissionais vinculados ── */}
      <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm relative">
        <p className="text-sm font-bold text-foreground m-0 mb-5">Profissionais vinculados</p>
        <p className="text-[13px] text-muted-foreground m-0 mb-4">
          Restringe quais profissionais este cliente pode agendar. Deixe vazio para não restringir.
        </p>

        <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allProfs}
            onChange={e => {
              setAllProfs(e.target.checked)
              if (e.target.checked) { setSelectedProfs([]); setProfSearch(''); setShowProfDrop(false) }
            }}
            className="w-4 h-4 accent-indigo-500 cursor-pointer shrink-0"
          />
          <span className="text-[13.5px] font-medium text-foreground">Todos os profissionais</span>
          <span className="text-xs text-muted-foreground">O cliente poderá agendar com qualquer profissional</span>
        </label>

        {!allProfs && (
          <div ref={profRef} className="relative">
            <input
              type="text"
              value={profSearch}
              onChange={e => { setProfSearch(e.target.value); setShowProfDrop(true) }}
              onFocus={() => setShowProfDrop(true)}
              placeholder="Buscar profissional pelo nome..."
              className="w-full h-[42px] px-3 text-sm text-foreground bg-background rounded-lg border border-border outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />

            {showProfDrop && profSearch.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg z-10 max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-top-1.5 duration-150">
                {filteredProfs.length === 0 ? (
                  <div className="px-3.5 py-3 text-[13px] text-muted-foreground">Nenhum profissional encontrado</div>
                ) : filteredProfs.slice(0, 8).map(p => (
                  <div
                    key={p.id}
                    onMouseDown={() => addProf(p)}
                    className="px-3.5 py-2.5 cursor-pointer flex items-center gap-2.5 hover:bg-accent"
                  >
                    <AvatarName name={p.name} size={28} />
                    <span className="text-[13px] text-muted-foreground">{p.position ?? p.email}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedProfs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedProfs.map(p => (
                  <span key={p.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 pl-1.5 bg-blue-50 border border-blue-200 rounded-full text-[13px] text-blue-800 dark:bg-blue-500 dark:border-blue-500 dark:text-white">
                    <AvatarName name={p.name} size={20} />
                    {p.name}
                    <button
                      type="button"
                      className="bg-transparent border-0 cursor-pointer p-0 flex items-center text-blue-300 hover:text-blue-800 dark:text-white/70 dark:hover:text-white transition-colors"
                      onClick={() => removeProf(p.id)}
                      title="Remover"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Card 5: Serviços permitidos ── */}
      {services.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 mb-5 shadow-sm">
          <p className="text-sm font-bold text-foreground m-0 mb-5">Serviços permitidos</p>
          <p className="text-[13px] text-muted-foreground m-0 mb-4">
            Restringe quais serviços este cliente pode agendar. Deixe vazio para não restringir.
          </p>

          <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSvcs}
              onChange={e => {
                setAllSvcs(e.target.checked)
                if (e.target.checked) setSelectedServiceIds([])
              }}
              className="w-4 h-4 accent-indigo-500 cursor-pointer shrink-0"
            />
            <span className="text-[13.5px] font-medium text-foreground">Todos os serviços</span>
            <span className="text-xs text-muted-foreground">O cliente poderá agendar qualquer serviço</span>
          </label>

          {!allSvcs && (
            <div>
              {services.map((svc: Service) => (
                <div
                  key={svc.id}
                  className="flex items-center gap-2.5 py-2.5 border-b border-border last:border-b-0 cursor-pointer hover:bg-accent -mx-3 px-3 rounded-md transition-colors"
                  onClick={() => toggleService(svc.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedServiceIds.includes(svc.id)}
                    onChange={() => toggleService(svc.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer shrink-0"
                  />
                  <div>
                    <span className="text-[13.5px] font-medium text-foreground">{svc.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{svc.durationMinutes} min</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Card 6: Limite de serviços ── */}
      <div className="bg-card border border-border rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-foreground m-0 mb-2">Limite de serviços</p>
        <p className="text-[13px] text-muted-foreground m-0 mb-5">
          Define quantos agendamentos este cliente pode fazer em um determinado período.
        </p>

        {/* Mode selector */}
        <div className="flex flex-col gap-2 mb-5">
          {(['none', 'normal', 'per_service'] as LimitMode[]).map((lm) => {
            const labels: Record<LimitMode, string> = {
              none:        'Sem limite',
              normal:      'Normal',
              per_service: 'Por Serviço',
            }
            const descs: Record<LimitMode, string> = {
              none:        'Nenhuma restrição de quantidade de agendamentos',
              normal:      'Limite total por período, independente do serviço',
              per_service: 'Limite individual para cada serviço',
            }
            return (
              <label
                key={lm}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors',
                  limitMode === lm ? 'border-indigo-400 bg-indigo-500/10' : 'border-border hover:bg-accent',
                )}
              >
                <input
                  type="radio"
                  name="limitMode"
                  value={lm}
                  checked={limitMode === lm}
                  onChange={() => {
                    setLimitMode(lm)
                    if (lm !== 'normal') { set('serviceLimitCount', ''); set('serviceLimitPeriod', '') }
                    if (lm !== 'per_service') setPerServiceLimits({})
                  }}
                  className="mt-0.5 w-4 h-4 accent-indigo-500 cursor-pointer shrink-0"
                />
                <div>
                  <p className="m-0 text-[13.5px] font-semibold text-foreground">{labels[lm]}</p>
                  <p className="m-0 text-xs text-muted-foreground">{descs[lm]}</p>
                </div>
              </label>
            )
          })}
        </div>

        {/* Normal mode inputs */}
        {limitMode === 'normal' && (
          <div className="flex gap-3 items-end">
            <div className="[flex:0_0_140px]">
              <label htmlFor="client-limit-count" className="block text-[13px] font-medium text-foreground mb-1.5">Quantidade</label>
              <input
                id="client-limit-count"
                type="number"
                min={1}
                value={form.serviceLimitCount}
                onChange={e => set('serviceLimitCount', e.target.value)}
                placeholder="Ex: 3"
                className={inputCls(!!errors.serviceLimitCount)}
              />
              {errors.serviceLimitCount && <p className="text-xs text-red-500 mt-1 m-0">{errors.serviceLimitCount}</p>}
            </div>
            <div className="[flex:0_0_180px]">
              <label htmlFor="client-limit-period" className="block text-[13px] font-medium text-foreground mb-1.5">Por período</label>
              <div className="relative">
                <select
                  id="client-limit-period"
                  value={form.serviceLimitPeriod}
                  onChange={e => set('serviceLimitPeriod', e.target.value)}
                  className={cn(
                    'w-full h-[42px] pl-3 pr-8 text-sm text-foreground bg-background rounded-lg border appearance-none cursor-pointer outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
                    errors.serviceLimitPeriod ? 'border-red-400' : 'border-border',
                  )}
                >
                  <option value="">Selecione…</option>
                  <option value="day">Dia</option>
                  <option value="week">Semana</option>
                  <option value="month">Mês</option>
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {errors.serviceLimitPeriod && <p className="text-xs text-red-500 mt-1 m-0">{errors.serviceLimitPeriod}</p>}
            </div>
          </div>
        )}

        {/* Per-service mode inputs */}
        {limitMode === 'per_service' && (
          <div className="flex flex-col gap-3">
            {!allSvcs && selectedServiceIds.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Selecione serviços específicos em &quot;Serviços permitidos&quot; para configurar limites por serviço.
              </p>
            ) : (
              (allSvcs ? services.map((s: Service) => s.id) : selectedServiceIds).map(id => {
                const svc = services.find((s: Service) => s.id === id)
                const sl  = perServiceLimits[id] ?? { count: '', period: '' }
                return (
                  <div key={id} className="flex gap-3 items-end">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground mb-1.5 truncate">{svc?.name ?? id}</p>
                    </div>
                    <div className="[flex:0_0_120px]">
                      <label className="block text-[13px] font-medium text-foreground mb-1.5">Quantidade</label>
                      <input
                        type="number"
                        min={1}
                        value={sl.count}
                        onChange={e => setPerServiceLimits(prev => ({ ...prev, [id]: { ...sl, count: e.target.value } }))}
                        placeholder="Ex: 2"
                        className={inputCls(false)}
                      />
                    </div>
                    <div className="[flex:0_0_160px]">
                      <label className="block text-[13px] font-medium text-foreground mb-1.5">Período</label>
                      <div className="relative">
                        <select
                          value={sl.period}
                          onChange={e => setPerServiceLimits(prev => ({ ...prev, [id]: { ...sl, period: e.target.value } }))}
                          className="w-full h-[42px] pl-3 pr-8 text-sm text-foreground bg-background rounded-lg border border-border appearance-none cursor-pointer outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                        >
                          <option value="">Selecione…</option>
                          <option value="day">Dia</option>
                          <option value="week">Semana</option>
                          <option value="month">Mês</option>
                        </select>
                        <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* ── Card 7: Limite de cancelamentos ── */}
      <div className="bg-card border border-border rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-foreground m-0 mb-2">Limite de cancelamentos</p>
        <p className="text-[13px] text-muted-foreground m-0 mb-5">
          Define quantos cancelamentos este cliente pode realizar em um determinado período. Deixe em branco para não restringir.
        </p>
        <div className="flex gap-3 items-end">
          <div className="[flex:0_0_140px]">
            <label htmlFor="client-cancel-limit-count" className="block text-[13px] font-medium text-foreground mb-1.5">
              Quantidade
            </label>
            <input
              id="client-cancel-limit-count"
              type="number"
              min={1}
              value={form.cancellationLimitCount}
              onChange={e => set('cancellationLimitCount', e.target.value)}
              placeholder="Ex: 2"
              className={inputCls(!!errors.cancellationLimitCount)}
            />
            {errors.cancellationLimitCount && (
              <p className="text-xs text-red-500 mt-1 m-0">{errors.cancellationLimitCount}</p>
            )}
          </div>
          <div className="[flex:0_0_180px]">
            <label htmlFor="client-cancel-limit-period" className="block text-[13px] font-medium text-foreground mb-1.5">
              Por período
            </label>
            <div className="relative">
              <select
                id="client-cancel-limit-period"
                value={form.cancellationLimitPeriod}
                onChange={e => set('cancellationLimitPeriod', e.target.value)}
                className={cn(
                  'w-full h-[42px] pl-3 pr-8 text-sm text-foreground bg-background rounded-lg border appearance-none cursor-pointer outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
                  errors.cancellationLimitPeriod ? 'border-red-400' : 'border-border',
                )}
              >
                <option value="">Selecione…</option>
                <option value="day">Dia</option>
                <option value="week">Semana</option>
                <option value="month">Mês</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {errors.cancellationLimitPeriod && (
              <p className="text-xs text-red-500 mt-1 m-0">{errors.cancellationLimitPeriod}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      {errors.root && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 dark:bg-red-500 dark:border-red-500 dark:text-white">
          {errors.root}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
        >
          {mode === 'create' ? 'Cadastrar cliente' : 'Salvar alterações'}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

    </form>
  )
}
