'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import { useProfessionals } from '@/hooks/useProfessionals'
import { useServices } from '@/hooks/useServices'
import { AvatarName } from '@/components/ui/AvatarName'
import { BackButton } from '@/components/ui/BackButton'
import { cn } from '@/lib/utils'
import type { Professional, Service } from '@/types'

type FormState = {
  name: string
  email: string
  phone: string
  birthDate: string
  notes: string
  active: boolean
  serviceLimitCount: string
  serviceLimitPeriod: string
}

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: client, isLoading } = useClient(id)
  const update = useUpdateClient(id)

  const { data: allProfessionals = [] } = useProfessionals()
  const { data: allServices = [] } = useServices()

  const [ready, setReady] = useState(false)
  const [form, setForm] = useState<FormState>({
    name: '', email: '', phone: '', birthDate: '',
    notes: '', active: true, serviceLimitCount: '', serviceLimitPeriod: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'root', string>>>({})

  // Professional search
  const [allProfs, setAllProfs] = useState(false)
  const [profSearch, setProfSearch] = useState('')
  const [showProfDrop, setShowProfDrop] = useState(false)
  const [selectedProfs, setSelectedProfs] = useState<Professional[]>([])
  const profRef = useRef<HTMLDivElement>(null)

  // Service selection
  const [allSvcs, setAllSvcs] = useState(false)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  // Initialize form once client data loads
  useEffect(() => {
    if (!client || ready) return
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone ?? '',
      birthDate: client.birthDate ?? '',
      notes: client.notes ?? '',
      active: client.active !== false,
      serviceLimitCount: client.serviceLimitCount != null ? String(client.serviceLimitCount) : '',
      serviceLimitPeriod: client.serviceLimitPeriod ?? '',
    })
    setAllProfs(client.allProfessionals === true)
    setAllSvcs(client.allServices === true)
    setSelectedProfs(
      client.linkedProfessionals
        .map(lp => allProfessionals.find(p => p.id === lp.professionalId))
        .filter(Boolean) as Professional[]
    )
    setSelectedServiceIds(client.linkedServices.map(s => s.serviceId))
    setReady(true)
  }, [client, allProfessionals, ready])

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
      const patch: {
        name?: string; email?: string; phone?: string;
        birthDate?: string; notes?: string; active?: boolean; allProfessionals?: boolean; allServices?: boolean;
        serviceLimitCount?: number | null; serviceLimitPeriod?: string | null;
        professionalIds?: string[]; serviceIds?: string[];
      } = {
        name: form.name.trim(),
        email: form.email.trim(),
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
        patch.serviceLimitCount = Number(form.serviceLimitCount)
        patch.serviceLimitPeriod = form.serviceLimitPeriod || undefined
      } else {
        patch.serviceLimitCount = null
        patch.serviceLimitPeriod = null
      }
      await update.mutateAsync(patch)
      router.push(`/clients/${id}`)
    } catch {
      setErrors(e => ({ ...e, root: 'Não foi possível salvar as alterações. Verifique os dados e tente novamente.' }))
    }
  }

  if (isLoading || !ready) {
    return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  }

  return (
    <div>
      <div className="mb-7">
        <BackButton href={`/clients/${id}`}>Voltar para cliente</BackButton>
      </div>

      <form onSubmit={handleSubmit} noValidate>

        {/* Personal data */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 m-0 mb-5">Dados pessoais</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {([
              { key: 'name',  label: 'Nome completo', type: 'text',  required: true },
              { key: 'email', label: 'E-mail',         type: 'email', required: true },
              { key: 'phone', label: 'Telefone',        type: 'tel',   required: false },
            ] as const).map(({ key, label, type, required }) => (
              <div key={key}>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  {label}{required && <span className="text-red-400"> *</span>}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  className={cn(
                    'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
                    errors[key] ? 'border-red-400' : 'border-gray-200'
                  )}
                />
                {errors[key] && <p className="text-xs text-red-500 mt-1 m-0">{errors[key]}</p>}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Data de nascimento</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={e => set('birthDate', e.target.value)}
              className="w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              style={{ maxWidth: 220 }}
            />
          </div>
        </div>

        {/* Profile */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 m-0 mb-5">Perfil</p>

          <div className="mb-4">
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none resize-y transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Status</label>
            <div className="relative" style={{ maxWidth: 180 }}>
              <select
                value={form.active ? 'true' : 'false'}
                onChange={e => set('active', e.target.value === 'true')}
                className="w-full h-[42px] pl-3 pr-8 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 appearance-none cursor-pointer outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
        </div>

        {/* Service limits */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 m-0 mb-5">Limite de serviços</p>
          <p className="text-[13px] text-gray-500 m-0 mb-4">
            Define quantos agendamentos este cliente pode fazer em um determinado período.
          </p>

          <div className="flex gap-3 items-end">
            <div style={{ flex: '0 0 140px' }}>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Quantidade</label>
              <input
                type="number"
                min={1}
                value={form.serviceLimitCount}
                onChange={e => set('serviceLimitCount', e.target.value)}
                placeholder="Ex: 3"
                className={cn(
                  'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
                  errors.serviceLimitCount ? 'border-red-400' : 'border-gray-200'
                )}
              />
              {errors.serviceLimitCount && <p className="text-xs text-red-500 mt-1 m-0">{errors.serviceLimitCount}</p>}
            </div>
            <div style={{ flex: '0 0 180px' }}>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Por período</label>
              <div className="relative">
                <select
                  value={form.serviceLimitPeriod}
                  onChange={e => set('serviceLimitPeriod', e.target.value)}
                  className={cn(
                    'w-full h-[42px] pl-3 pr-8 text-sm text-gray-900 bg-white rounded-lg border appearance-none cursor-pointer outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
                    errors.serviceLimitPeriod ? 'border-red-400' : 'border-gray-200'
                  )}
                >
                  <option value="">Selecione…</option>
                  <option value="day">Dia</option>
                  <option value="week">Semana</option>
                  <option value="month">Mês</option>
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {errors.serviceLimitPeriod && <p className="text-xs text-red-500 mt-1 m-0">{errors.serviceLimitPeriod}</p>}
            </div>
            {form.serviceLimitCount && (
              <button
                type="button"
                onClick={() => { set('serviceLimitCount', ''); set('serviceLimitPeriod', '') }}
                className="h-[42px] px-3 bg-transparent border border-gray-200 rounded-lg text-xs text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ marginBottom: errors.serviceLimitCount || errors.serviceLimitPeriod ? 22 : 0 }}
              >
                Remover limite
              </button>
            )}
          </div>
        </div>

        {/* Professional linking */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm relative">
          <p className="text-sm font-bold text-gray-900 m-0 mb-5">Profissionais vinculados</p>
          <p className="text-[13px] text-gray-500 m-0 mb-4">
            Restringe quais profissionais este cliente pode agendar. Deixe vazio para não restringir.
          </p>

          {/* All professionals checkbox */}
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
            <span className="text-[13.5px] font-medium text-gray-700">Todos os profissionais</span>
            <span className="text-xs text-gray-400">O cliente poderá agendar com qualquer profissional</span>
          </label>

          {!allProfs && (
            <div ref={profRef} className="relative">
              <input
                type="text"
                value={profSearch}
                onChange={e => { setProfSearch(e.target.value); setShowProfDrop(true) }}
                onFocus={() => setShowProfDrop(true)}
                placeholder="Buscar profissional pelo nome..."
                className="w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              />

              {showProfDrop && profSearch.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-top-1.5 duration-150">
                  {filteredProfs.length === 0 ? (
                    <div className="px-3.5 py-3 text-[13px] text-gray-400">Nenhum profissional encontrado</div>
                  ) : filteredProfs.slice(0, 8).map(p => (
                    <div
                      key={p.id}
                      onMouseDown={() => addProf(p)}
                      className="px-3.5 py-2.5 cursor-pointer flex items-center gap-2.5 hover:bg-gray-50"
                    >
                      <AvatarName name={p.name} size={28} />
                      <span className="text-[13px] text-gray-500">{p.position ?? p.email}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedProfs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedProfs.map(p => (
                    <span key={p.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 pl-1.5 bg-blue-50 border border-blue-200 rounded-full text-[13px] text-blue-800">
                      <AvatarName name={p.name} size={20} />
                      {p.name}
                      <button
                        type="button"
                        className="bg-transparent border-0 cursor-pointer p-0 flex items-center text-blue-300 hover:text-blue-800 transition-colors"
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
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
            <p className="text-sm font-bold text-gray-900 m-0 mb-5">Serviços permitidos</p>
            <p className="text-[13px] text-gray-500 m-0 mb-4">
              Restringe quais serviços este cliente pode agendar. Deixe vazio para não restringir.
            </p>

            {/* All services checkbox */}
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
              <span className="text-[13.5px] font-medium text-gray-700">Todos os serviços</span>
              <span className="text-xs text-gray-400">O cliente poderá agendar qualquer serviço</span>
            </label>

            {!allSvcs && (
              <div>
                {allServices.map((svc: Service) => (
                  <div
                    key={svc.id}
                    className="flex items-center gap-2.5 py-2.5 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 -mx-3 px-3 rounded-md transition-colors"
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
                      <span className="text-[13.5px] font-medium text-gray-900">{svc.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{svc.durationMinutes} min</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {errors.root && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
            {errors.root}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={update.isPending}
            className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
          >
            {update.isPending ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Salvando...
              </>
            ) : 'Salvar alterações'}
          </button>
          <button
            type="button"
            className="h-[42px] px-5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => router.push(`/clients/${id}`)}
          >
            Cancelar
          </button>
        </div>

      </form>
    </div>
  )
}
