'use client'

import { useState, useEffect } from 'react'
import { LogoCropField } from '@/components/ui/LogoCropField'
import { useTenantSettings, useUpdateTenantSettings } from '@/hooks/useTenantSettings'
import { cn } from '@/lib/utils'

const inputCls = (disabled = false) => cn(
  'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none transition-colors',
  disabled
    ? 'opacity-60 cursor-not-allowed bg-gray-50'
    : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
)

export function TenantGeneralForm() {
  const { data, isLoading } = useTenantSettings()
  const { mutateAsync, isPending } = useUpdateTenantSettings()

  const [name,     setName]     = useState('')
  const [logoUrl,  setLogoUrl]  = useState<string | null>(null)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  useEffect(() => {
    if (!data) return
    setName(data.name)
    setLogoUrl(data.logoUrl)
  }, [data])

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || name.trim().length < 2) {
      setError('Nome deve ter pelo menos 2 caracteres.')
      return
    }
    setError('')
    setSuccess(false)
    try {
      await mutateAsync({ name: name.trim(), logoUrl })
      setSuccess(true)
    } catch {
      setError('Não foi possível salvar as alterações. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── Logo ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Logo</p>
        <p className="text-[13px] text-gray-500 m-0 mb-4">
          Aparece no topo do menu lateral. Proporção 3:1 (horizontal).
        </p>
        <LogoCropField value={logoUrl} onChange={(v) => { setLogoUrl(v); setSuccess(false) }} />
        {logoUrl && (
          <button
            type="button"
            onClick={() => setLogoUrl(null)}
            className="mt-3 text-xs text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer p-0 transition-colors"
          >
            Remover logo
          </button>
        )}
      </div>

      {/* ── Dados ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Informações</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tenant-name" className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Nome <span className="text-red-400">*</span>
            </label>
            <input
              id="tenant-name"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); setSuccess(false) }}
              className={inputCls()}
            />
          </div>
          <div>
            <label htmlFor="tenant-slug" className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Host (slug)
            </label>
            <input
              id="tenant-slug"
              type="text"
              value={data?.slug ?? ''}
              disabled
              className={inputCls(true)}
            />
            <p className="text-[11px] text-gray-400 mt-1 m-0">O host não pode ser alterado.</p>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      {error && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[13px] text-emerald-700">
          Alterações salvas com sucesso.
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Salvando...
            </>
          ) : 'Salvar alterações'}
        </button>
      </div>

    </form>
  )
}
