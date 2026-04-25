# Clients Shared Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a shared `ClientForm` component from the duplicate form code in `clients/new/page.tsx` and `clients/[id]/edit/page.tsx`, so any change to the form is automatically reflected in both flows.

**Architecture:** Create `clients/_components/ClientForm.tsx` that owns all form state, validation, and JSX. The two page files become thin wrappers that fetch their data and pass it down via `mode`, `defaultValues`, `onSubmit`, and `onCancel` props. The pages themselves do not change routes or loading patterns.

**Tech Stack:** React (`useState`, `useRef`, `useEffect`), TanStack Query hooks (`useProfessionals`, `useServices`), existing UI components (`AvatarCropField`, `DatePickerField`, `BackButton`, `AvatarName`), Tailwind + `cn()`.

---

## File Map

| Action | Path |
|--------|------|
| **Create** | `packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx` |
| **Replace** | `packages/web/src/app/(tenant)/(app)/clients/new/page.tsx` |
| **Replace** | `packages/web/src/app/(tenant)/(app)/clients/[id]/edit/page.tsx` |

---

### Task 1: Create `ClientForm.tsx`

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx`

- [ ] **Step 1: Create the `_components` directory and write `ClientForm.tsx`**

Write the full file at `packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useProfessionals } from '@/hooks/useProfessionals'
import { useServices } from '@/hooks/useServices'
import { AvatarCropField } from '@/components/ui/AvatarCropField'
import { AvatarName } from '@/components/ui/AvatarName'
import { DatePickerField } from '@/components/ui/DatePickerField'
import { cn } from '@/lib/utils'
import type { Professional, Service, ClientDetail } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClientFormData = {
  name: string
  email: string
  password?: string
  phone?: string
  birthDate?: string
  notes?: string
  active: boolean
  avatarUrl?: string
  allProfessionals: boolean
  allServices: boolean
  professionalIds: string[]
  serviceIds: string[]
  serviceLimitCount?: number
  serviceLimitPeriod?: 'day' | 'week' | 'month'
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
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

const inputCls = (hasError = false) => cn(
  'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
  hasError ? 'border-red-400' : 'border-gray-200',
)

// ── Component ─────────────────────────────────────────────────────────────────

export function ClientForm({ mode, defaultValues, onSubmit, onCancel, isOwnProfile }: ClientFormProps) {
  const { data: allProfessionals = [] } = useProfessionals()
  const { data: allServices = [] } = useServices()

  const [initialized, setInitialized] = useState(mode === 'create')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    name: '', email: '', password: '', phone: '',
    birthDate: '', notes: '', active: true,
    serviceLimitCount: '', serviceLimitPeriod: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'root', string>>>({})

  const [allProfs, setAllProfs] = useState(true)
  const [selectedProfs, setSelectedProfs] = useState<Professional[]>([])
  const [profSearch, setProfSearch] = useState('')
  const [showProfDrop, setShowProfDrop] = useState(false)
  const profRef = useRef<HTMLDivElement>(null)

  const [allSvcs, setAllSvcs] = useState(true)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  // Initialize edit form once both defaultValues and allProfessionals are ready
  useEffect(() => {
    if (mode !== 'edit' || !defaultValues || initialized || allProfessionals.length === 0) return
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
    })
    setAvatarUrl(defaultValues.avatarUrl ?? null)
    setAllProfs(defaultValues.allProfessionals === true)
    setAllSvcs(defaultValues.allServices === true)
    setSelectedProfs(
      defaultValues.linkedProfessionals
        .map(lp => allProfessionals.find(p => p.id === lp.professionalId))
        .filter(Boolean) as Professional[]
    )
    setSelectedServiceIds(defaultValues.linkedServices.map(s => s.serviceId))
    setInitialized(true)
  }, [mode, defaultValues, allProfessionals, initialized])

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

  if (!initialized) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>

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
    if (mode === 'create') {
      if (!form.password) e.password = 'Senha obrigatória'
      else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    }
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
    setIsSubmitting(true)
    try {
      const data: ClientFormData = {
        name:             form.name.trim(),
        email:            form.email.trim(),
        ...(mode === 'create' ? { password: form.password } : {}),
        phone:            form.phone.trim() || undefined,
        birthDate:        form.birthDate || undefined,
        notes:            form.notes.trim() || undefined,
        active:           form.active,
        avatarUrl:        avatarUrl ?? undefined,
        allProfessionals: allProfs,
        allServices:      allSvcs,
        professionalIds:  allProfs ? [] : selectedProfs.map(p => p.id),
        serviceIds:       allSvcs ? [] : selectedServiceIds,
        ...(form.serviceLimitCount
          ? {
              serviceLimitCount:  Number(form.serviceLimitCount),
              serviceLimitPeriod: form.serviceLimitPeriod as 'day' | 'week' | 'month',
            }
          : {}),
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

  const showStatus = mode === 'create' || !isOwnProfile

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── Card 1: Dados pessoais ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Dados pessoais</p>

        <div className="mb-5">
          <AvatarCropField value={avatarUrl} onChange={setAvatarUrl} name={form.name} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="client-name" className="block text-[13px] font-medium text-gray-700 mb-1.5">
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
            <label htmlFor="client-email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
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
            <div>
              <label htmlFor="client-password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
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
          <div>
            <label htmlFor="client-phone" className="block text-[13px] font-medium text-gray-700 mb-1.5">
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
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Data de nascimento</label>
          <DatePickerField
            value={form.birthDate}
            onChange={iso => set('birthDate', iso)}
            className="max-w-[220px]"
          />
        </div>
      </div>

      {/* ── Card 2: Perfil ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Perfil</p>

        <div className="mb-4">
          <label htmlFor="client-notes" className="block text-[13px] font-medium text-gray-700 mb-1.5">Observações</label>
          <textarea
            id="client-notes"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none resize-y transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {showStatus && (
          <div>
            <label htmlFor="client-active" className="block text-[13px] font-medium text-gray-700 mb-1.5">Status</label>
            <div className="relative max-w-[180px]">
              <select
                id="client-active"
                value={form.active ? 'true' : 'false'}
                onChange={e => set('active', e.target.value === 'true')}
                className="w-full h-[42px] pl-3 pr-8 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 appearance-none cursor-pointer outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* ── Card 3: Limite de serviços ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Limite de serviços</p>
        <p className="text-[13px] text-gray-500 m-0 mb-4">
          Define quantos agendamentos este cliente pode fazer em um determinado período.
        </p>

        <div className="flex gap-3 items-end">
          <div className="[flex:0_0_140px]">
            <label htmlFor="client-limit-count" className="block text-[13px] font-medium text-gray-700 mb-1.5">Quantidade</label>
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
            <label htmlFor="client-limit-period" className="block text-[13px] font-medium text-gray-700 mb-1.5">Por período</label>
            <div className="relative">
              <select
                id="client-limit-period"
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
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
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

      {/* ── Card 4: Profissionais vinculados ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm relative">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Profissionais vinculados</p>
        <p className="text-[13px] text-gray-500 m-0 mb-4">
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
      {allServices.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 m-0 mb-5">Serviços permitidos</p>
          <p className="text-[13px] text-gray-500 m-0 mb-4">
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

      {/* ── Footer ── */}
      {errors.root && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
          {errors.root}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Salvando...
            </>
          ) : mode === 'create' ? 'Cadastrar cliente' : 'Salvar alterações'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-[42px] px-5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>

    </form>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles without errors**

Run from the monorepo root:
```bash
cd packages/web && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors related to `ClientForm.tsx`. If there are errors, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/\(tenant\)/\(app\)/clients/_components/ClientForm.tsx
git commit -m "feat: extract shared ClientForm component for clients module"
```

---

### Task 2: Simplify `new/page.tsx`

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/clients/new/page.tsx`

- [ ] **Step 1: Replace the entire file**

Replace `packages/web/src/app/(tenant)/(app)/clients/new/page.tsx` with:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCreateClient } from '@/hooks/useClients'
import { BackButton } from '@/components/ui/BackButton'
import { ClientForm, type ClientFormData } from '../_components/ClientForm'

export default function NewClientPage() {
  const router = useRouter()
  const { mutateAsync } = useCreateClient()

  return (
    <div>
      <BackButton href="/clients" variant="ghost">Voltar para clientes</BackButton>
      <ClientForm
        mode="create"
        onSubmit={async (data: ClientFormData) => {
          await mutateAsync({
            name:             data.name,
            email:            data.email,
            password:         data.password!,
            phone:            data.phone,
            birthDate:        data.birthDate,
            notes:            data.notes,
            active:           data.active,
            avatarUrl:        data.avatarUrl,
            allProfessionals: data.allProfessionals,
            allServices:      data.allServices,
            professionalIds:  data.professionalIds,
            serviceIds:       data.serviceIds,
            ...(data.serviceLimitCount != null
              ? { serviceLimitCount: data.serviceLimitCount, serviceLimitPeriod: data.serviceLimitPeriod }
              : {}),
          })
          router.push('/clients')
        }}
        onCancel={() => router.push('/clients')}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/web && npx tsc --noEmit 2>&1 | head -40
```

Expected: no new errors.

- [ ] **Step 3: Verify create flow manually**

Start the dev server if not already running:
```bash
pnpm dev:web
```

Navigate to `/clients/new`, fill in name + email + password, submit. Confirm the client appears in the list.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/\(tenant\)/\(app\)/clients/new/page.tsx
git commit -m "refactor: simplify new client page to delegate to ClientForm"
```

---

### Task 3: Simplify `[id]/edit/page.tsx`

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/clients/[id]/edit/page.tsx`

- [ ] **Step 1: Replace the entire file**

Replace `packages/web/src/app/(tenant)/(app)/clients/[id]/edit/page.tsx` with:

```tsx
'use client'

import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import { BackButton } from '@/components/ui/BackButton'
import { ClientForm, type ClientFormData } from '../../_components/ClientForm'

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me, updateUser } = useAuth()
  const isOwnProfile = id === me?.id

  const { data: client, isLoading } = useClient(id)
  const { mutateAsync } = useUpdateClient(id)

  if (isLoading || !client) {
    return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  }

  return (
    <div>
      <div className="mb-7">
        <BackButton href={`/clients/${id}`}>Voltar para cliente</BackButton>
      </div>
      <ClientForm
        mode="edit"
        defaultValues={client}
        isOwnProfile={isOwnProfile}
        onSubmit={async (data: ClientFormData) => {
          await mutateAsync({
            name:             data.name,
            email:            data.email,
            phone:            data.phone,
            birthDate:        data.birthDate,
            notes:            data.notes,
            active:           data.active,
            avatarUrl:        data.avatarUrl,
            allProfessionals: data.allProfessionals,
            allServices:      data.allServices,
            professionalIds:  data.professionalIds,
            serviceIds:       data.serviceIds,
            serviceLimitCount:  data.serviceLimitCount ?? null,
            serviceLimitPeriod: data.serviceLimitCount
              ? data.serviceLimitPeriod ?? null
              : null,
          })
          if (isOwnProfile) updateUser({ name: data.name, avatarUrl: data.avatarUrl ?? null })
          router.push(`/clients/${id}`)
        }}
        onCancel={() => router.push(`/clients/${id}`)}
      />
    </div>
  )
}
```

**Note on `serviceLimitCount: null`:** The edit mutation accepts `number | null`. Passing `null` explicitly clears the limit in the database. The create mutation does not support null — it simply omits the field. This difference is handled here in the page's `onSubmit`, not inside `ClientForm`.

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/web && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Verify edit flow manually**

Navigate to an existing client's edit page. Verify:
1. Form pre-populates with existing data (name, email, phone, linked professionals, linked services, service limit)
2. "Status" field is visible when editing as admin, hidden when editing own profile
3. Submitting saves changes and redirects to the client detail page
4. Clearing the service limit count and saving correctly clears it (the API receives `serviceLimitCount: null`)

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/\(tenant\)/\(app\)/clients/\[id\]/edit/page.tsx
git commit -m "refactor: simplify edit client page to delegate to ClientForm"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Covered in |
|---|---|
| `ClientForm` with `mode`, `defaultValues`, `onSubmit`, `onCancel`, `isOwnProfile` props | Task 1 |
| `ClientFormData` type exported | Task 1 |
| `applyPhoneMask` in one place only | Task 1 — removed from both page files, lives only in `ClientForm.tsx` |
| Edit initializes from `defaultValues` + waits for `allProfessionals` | Task 1 — `useEffect` guard: `allProfessionals.length === 0` |
| `initialized` starts `true` for create, waits for edit | Task 1 — `useState(mode === 'create')` |
| Five-card layout | Task 1 |
| Password field create-only | Task 1 — `{mode === 'create' && ...}` |
| Status hidden for own profile in edit | Task 1 — `showStatus = mode === 'create' || !isOwnProfile` |
| `serviceLimitCount: null` sent by edit to clear | Task 3 — in page's `onSubmit` |
| `new/page.tsx` simplified | Task 2 |
| `[id]/edit/page.tsx` simplified | Task 3 |
| `updateUser` called after own profile edit | Task 3 |

All spec requirements covered. No placeholders.
