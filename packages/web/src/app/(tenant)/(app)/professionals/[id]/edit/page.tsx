'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProfessional, useUpdateProfessional } from '@/hooks/useProfessionals'
import { AvatarCropField } from '@/components/ui/AvatarCropField'
import { BackButton } from '@/components/ui/BackButton'
import { cn } from '@/lib/utils'

export default function EditProfessionalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me, updateUser } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: prof, isLoading } = useProfessional(id)
  const isOwnProfile = !!prof && prof.userId === me?.id
  const update = useUpdateProfessional(id)

  const [ready, setReady] = useState(false)
  const [name, setName]         = useState('')
  const [position, setPosition] = useState('')
  const [bio, setBio]           = useState('')
  const [active, setActive]     = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!prof || ready) return
    setName(prof.name)
    setPosition(prof.position ?? '')
    setBio(prof.bio ?? '')
    setActive(prof.active)
    setAvatarUrl(prof.avatarUrl ?? null)
    setReady(true)
  }, [prof, ready])

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setError('')
    try {
      const patch: Record<string, unknown> = {
        name: name.trim(),
        position: position.trim() || undefined,
        bio: bio.trim() || undefined,
        role: 'professional',
        avatarUrl: avatarUrl ?? undefined,
      }
      if (isAdmin) {
        patch.active = active
      }
      await update.mutateAsync(patch)
      if (isOwnProfile) updateUser({ name: name.trim(), avatarUrl: avatarUrl ?? null })
      router.push(`/professionals/${id}`)
    } catch {
      setError('Não foi possível salvar as alterações. Verifique os dados e tente novamente.')
    }
  }

  if (isLoading || !ready) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>

  const inputCls = 'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10'
  const selectCls = cn(inputCls, 'appearance-none cursor-pointer')

  return (
    <div>
      <div className="mb-7">
        <BackButton href={`/professionals/${id}`}>Voltar para profissional</BackButton>
      </div>

      <form onSubmit={handleSubmit} noValidate>

        {/* Personal data */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 m-0 mb-5">Dados pessoais</p>

          <div className="mb-5">
            <AvatarCropField value={avatarUrl} onChange={setAvatarUrl} name={name} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Nome completo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Cargo</label>
              <input
                type="text"
                value={position}
                onChange={e => setPosition(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 m-0 mb-5">Perfil</p>

          <div className="mb-4">
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none resize-y transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          {isAdmin && !isOwnProfile && (
            <div className="max-w-[220px]">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Status</label>
                <div className="relative">
                  <select
                    value={active ? 'true' : 'false'}
                    onChange={e => setActive(e.target.value === 'true')}
                    className={selectCls}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
            {error}
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
            onClick={() => router.push(`/professionals/${id}`)}
          >
            Cancelar
          </button>
        </div>

      </form>
    </div>
  )
}
