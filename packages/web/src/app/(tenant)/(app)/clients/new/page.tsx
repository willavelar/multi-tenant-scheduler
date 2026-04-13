'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateClient } from '@/hooks/useClients'
import { useProfessionals } from '@/hooks/useProfessionals'
import { useServices } from '@/hooks/useServices'
import { AvatarName } from '@/components/ui/AvatarName'
import { BackButton } from '@/components/ui/BackButton'
import type { Professional, Service } from '@/types'

const inputStyle = (focused: boolean, hasError = false): React.CSSProperties => ({
  width: '100%', height: 42, padding: '0 12px', fontSize: 14,
  color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box',
  border: `1px solid ${hasError ? '#ef4444' : focused ? '#6366f1' : '#e5e7eb'}`,
  borderRadius: 8,
  boxShadow: focused && !hasError ? '0 0 0 3px rgba(99,102,241,0.10)' : 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: 'var(--font-inter, Inter, sans-serif)',
})

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6,
}

const sectionStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
  padding: '24px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 20px',
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
}

export default function NewClientPage() {
  const router = useRouter()
  const create = useCreateClient()

  const { data: allProfessionals = [] } = useProfessionals()
  const { data: allServices = [] } = useServices()

  const [form, setForm] = useState<FormState>({
    name: '', email: '', password: '', phone: '',
    birthDate: '', notes: '', active: true,
    serviceLimitCount: '', serviceLimitPeriod: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'root', string>>>({})
  const [focused, setFocused] = useState<Record<string, boolean>>({})

  // Professional search
  const [allProfs, setAllProfs] = useState(false)
  const [profSearch, setProfSearch] = useState('')
  const [showProfDrop, setShowProfDrop] = useState(false)
  const [selectedProfs, setSelectedProfs] = useState<Professional[]>([])
  const profRef = useRef<HTMLDivElement>(null)

  // Service selection
  const [allSvcs, setAllSvcs] = useState(false)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  const focus = (k: string) => setFocused(p => ({ ...p, [k]: true }))
  const blur  = (k: string) => setFocused(p => ({ ...p, [k]: false }))
  const set   = (k: keyof FormState, v: string | boolean) => {
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

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (profRef.current && !profRef.current.contains(e.target as Node)) {
        setShowProfDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function validate(): boolean {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (!form.email.trim()) e.email = 'E-mail obrigatório'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido'
    if (!form.password) e.password = 'Senha obrigatória'
    else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    if (form.serviceLimitCount && isNaN(Number(form.serviceLimitCount))) {
      e.serviceLimitCount = 'Valor inválido'
    }
    if (form.serviceLimitCount && !form.serviceLimitPeriod) {
      e.serviceLimitPeriod = 'Selecione o período'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    try {
      const body: {
        name: string; email: string; password: string;
        phone?: string; birthDate?: string; notes?: string; active?: boolean;
        serviceLimitCount?: number; serviceLimitPeriod?: 'day' | 'week' | 'month';
        professionalIds?: string[]; serviceIds?: string[];
      } = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        birthDate: form.birthDate || undefined,
        notes: form.notes.trim() || undefined,
        active: form.active,
        allProfessionals: allProfs,
        allServices: allSvcs,
        professionalIds: allProfs ? [] : selectedProfs.map(p => p.id),
        serviceIds: allSvcs ? [] : selectedServiceIds,
      }
      if (form.serviceLimitCount) {
        body.serviceLimitCount = Number(form.serviceLimitCount)
        body.serviceLimitPeriod = form.serviceLimitPeriod as 'day' | 'week' | 'month' | undefined
      }
      await create.mutateAsync(body)
      router.push('/clients')
    } catch {
      setErrors(e => ({ ...e, root: 'Não foi possível cadastrar o cliente. Verifique os dados e tente novamente.' }))
    }
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .submit-btn { height: 42px; padding: 0 24px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; font-family: var(--font-inter, Inter, sans-serif); display: inline-flex; align-items: center; gap: 8px; }
        .submit-btn:hover:not(:disabled) { background: #4f46e5; }
        .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .cancel-btn { height: 42px; padding: 0 20px; background: #fff; color: #374151; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: var(--font-inter, Inter, sans-serif); }
        .cancel-btn:hover { background: #f9fafb; }
        .prof-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 6px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 20px; font-size: 13px; color: #1e40af; }
        .prof-chip-remove { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: #93c5fd; }
        .prof-chip-remove:hover { color: #1e40af; }
        .svc-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f3f4f6; cursor: pointer; }
        .svc-item:last-child { border-bottom: none; }
        .svc-item:hover { background: #f9fafb; margin: 0 -12px; padding-left: 12px; padding-right: 12px; border-radius: 6px; }
      `}</style>

      <div style={{ maxWidth: 680 }}>
        <BackButton href="/clients" variant="ghost">Voltar para clientes</BackButton>

        <form onSubmit={handleSubmit} noValidate>

          {/* Personal data */}
          <div style={sectionStyle}>
            <p style={sectionTitle}>Dados pessoais</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {([
                { key: 'name',  label: 'Nome completo', type: 'text',     required: true },
                { key: 'email', label: 'E-mail',         type: 'email',   required: true },
                { key: 'password', label: 'Senha inicial', type: 'password', required: true, col: 1 },
                { key: 'phone', label: 'Telefone',        type: 'tel',    required: false },
              ] as const).map(({ key, label, type, required }) => (
                <div key={key} style={{ gridColumn: key === 'name' || key === 'email' ? undefined : undefined }}>
                  <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    onFocus={() => focus(key)}
                    onBlur={() => blur(key)}
                    style={inputStyle(!!focused[key], !!errors[key])}
                  />
                  {errors[key] && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>{errors[key]}</p>}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Data de nascimento</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={e => set('birthDate', e.target.value)}
                onFocus={() => focus('birthDate')}
                onBlur={() => blur('birthDate')}
                style={{ ...inputStyle(!!focused['birthDate']), maxWidth: 220 }}
              />
            </div>
          </div>

          {/* Profile */}
          <div style={sectionStyle}>
            <p style={sectionTitle}>Perfil</p>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Observações</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                onFocus={() => focus('notes')}
                onBlur={() => blur('notes')}
                rows={3}
                style={{ ...inputStyle(!!focused['notes']), height: 'auto', padding: '10px 12px', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={form.active ? 'true' : 'false'}
                onChange={e => set('active', e.target.value === 'true')}
                style={{ ...inputStyle(false), maxWidth: 180, cursor: 'pointer' }}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>

          {/* Service limits */}
          <div style={sectionStyle}>
            <p style={sectionTitle}>Limite de serviços</p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
              Define quantos agendamentos este cliente pode fazer em um determinado período.
            </p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: '0 0 140px' }}>
                <label style={labelStyle}>Quantidade</label>
                <input
                  type="number"
                  min={1}
                  value={form.serviceLimitCount}
                  onChange={e => set('serviceLimitCount', e.target.value)}
                  onFocus={() => focus('serviceLimitCount')}
                  onBlur={() => blur('serviceLimitCount')}
                  placeholder="Ex: 3"
                  style={inputStyle(!!focused['serviceLimitCount'], !!errors['serviceLimitCount'])}
                />
                {errors.serviceLimitCount && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>{errors.serviceLimitCount}</p>}
              </div>
              <div style={{ flex: '0 0 180px' }}>
                <label style={labelStyle}>Por período</label>
                <select
                  value={form.serviceLimitPeriod}
                  onChange={e => set('serviceLimitPeriod', e.target.value)}
                  style={{ ...inputStyle(false, !!errors['serviceLimitPeriod']), cursor: 'pointer' }}
                >
                  <option value="">Selecione…</option>
                  <option value="day">Dia</option>
                  <option value="week">Semana</option>
                  <option value="month">Mês</option>
                </select>
                {errors.serviceLimitPeriod && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>{errors.serviceLimitPeriod}</p>}
              </div>
              {form.serviceLimitCount && (
                <button
                  type="button"
                  onClick={() => { set('serviceLimitCount', ''); set('serviceLimitPeriod', '') }}
                  style={{ height: 42, padding: '0 12px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#6b7280', cursor: 'pointer', marginBottom: errors.serviceLimitCount || errors.serviceLimitPeriod ? 22 : 0 }}
                >
                  Remover limite
                </button>
              )}
            </div>
          </div>

          {/* Professional linking */}
          <div style={{ ...sectionStyle, position: 'relative' }}>
            <p style={sectionTitle}>Profissionais vinculados</p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
              Restringe quais profissionais este cliente pode agendar. Deixe vazio para não restringir.
            </p>

            {/* All professionals checkbox */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={allProfs}
                onChange={e => {
                  setAllProfs(e.target.checked)
                  if (e.target.checked) { setSelectedProfs([]); setProfSearch(''); setShowProfDrop(false) }
                }}
                style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontSize: 13.5, fontWeight: 500, color: '#374151' }}>Todos os profissionais</span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>O cliente poderá agendar com qualquer profissional</span>
            </label>

            {!allProfs && (
              <div ref={profRef} style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={profSearch}
                  onChange={e => { setProfSearch(e.target.value); setShowProfDrop(true) }}
                  onFocus={() => setShowProfDrop(true)}
                  placeholder="Buscar profissional pelo nome..."
                  style={inputStyle(showProfDrop)}
                />

                {showProfDrop && profSearch.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 46, left: 0, right: 0,
                    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 20,
                    maxHeight: 220, overflowY: 'auto',
                  }}>
                    {filteredProfs.length === 0 ? (
                      <div style={{ padding: '12px 14px', fontSize: 13, color: '#9ca3af' }}>Nenhum profissional encontrado</div>
                    ) : filteredProfs.slice(0, 8).map(p => (
                      <div
                        key={p.id}
                        onMouseDown={() => addProf(p)}
                        style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <AvatarName name={p.name} size={28} />
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{p.position ?? p.email}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedProfs.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedProfs.map(p => (
                      <span key={p.id} className="prof-chip">
                        <AvatarName name={p.name} size={20} />
                        <button
                          type="button"
                          className="prof-chip-remove"
                          onClick={() => removeProf(p.id)}
                          title="Remover"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Services */}
          {allServices.length > 0 && (
            <div style={sectionStyle}>
              <p style={sectionTitle}>Serviços permitidos</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
                Restringe quais serviços este cliente pode agendar. Deixe vazio para não restringir.
              </p>

              {/* All services checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={allSvcs}
                  onChange={e => {
                    setAllSvcs(e.target.checked)
                    if (e.target.checked) setSelectedServiceIds([])
                  }}
                  style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontSize: 13.5, fontWeight: 500, color: '#374151' }}>Todos os serviços</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>O cliente poderá agendar qualquer serviço</span>
              </label>

              {!allSvcs && (
              <div>
                {allServices.map((svc: Service) => (
                  <div
                    key={svc.id}
                    className="svc-item"
                    onClick={() => toggleService(svc.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(svc.id)}
                      onChange={() => toggleService(svc.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div>
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: '#111827' }}>{svc.name}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{svc.durationMinutes} min</span>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          )}

          {errors.root && (
            <div style={{ marginBottom: 16, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#b91c1c' }}>
              {errors.root}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="submit-btn" disabled={create.isPending}>
              {create.isPending ? (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.75s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Salvando...</>
              ) : 'Cadastrar cliente'}
            </button>
            <button type="button" className="cancel-btn" onClick={() => router.push('/clients')}>
              Cancelar
            </button>
          </div>

        </form>
      </div>
    </>
  )
}
