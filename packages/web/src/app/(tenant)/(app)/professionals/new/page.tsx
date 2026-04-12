'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter } from 'next/navigation'
import { useCreateProfessional } from '@/hooks/useProfessionals'

const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  email:     z.string().email('E-mail inválido'),
  password:  z.string().min(8, 'Mínimo 8 caracteres'),
  position:  z.string().optional(),
  bio:       z.string().optional(),
})
type FormData = z.infer<typeof schema>

const inputStyle = (focused: boolean, hasError: boolean): React.CSSProperties => ({
  width: '100%', height: 42, padding: '0 12px', fontSize: 14,
  color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box',
  border: `1px solid ${hasError ? '#ef4444' : focused ? '#6366f1' : '#e5e7eb'}`,
  borderRadius: 8,
  boxShadow: focused && !hasError ? '0 0 0 3px rgba(99,102,241,0.10)' : 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
})

export default function NewProfessionalPage() {
  const router = useRouter()
  const create = useCreateProfessional()
  const [focused, setFocused] = useState<Record<string, boolean>>({})
  const focus = (k: string) => setFocused(p => ({ ...p, [k]: true }))
  const blur  = (k: string) => setFocused(p => ({ ...p, [k]: false }))

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await create.mutateAsync(data)
      router.push('/professionals')
    } catch {
      setError('root', { message: 'Não foi possível cadastrar. Verifique os dados e tente novamente.' })
    }
  }

  const field = (key: keyof FormData) => ({
    ...register(key),
    onFocus: () => focus(key),
    onBlur:  () => blur(key),
    style: inputStyle(!!focused[key], !!errors[key]),
  })

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .save-btn { width: 100%; height: 42px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s; font-family: var(--font-inter, Inter, sans-serif); display: flex; align-items: center; justify-content: center; gap: 8px; }
        .save-btn:hover:not(:disabled) { background: #4f46e5; transform: translateY(-1px); }
        .save-btn:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>

      <div style={{ maxWidth: 560 }}>
        <button onClick={() => router.push('/professionals')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px', fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar para profissionais
        </button>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '28px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 24px' }}>Dados do profissional</h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {[
              { key: 'name',     label: 'Nome completo',  type: 'text',     required: true },
              { key: 'email',    label: 'E-mail',         type: 'email',    required: true },
              { key: 'password', label: 'Senha inicial',  type: 'password', required: true },
              { key: 'position', label: 'Cargo',          type: 'text',     required: false },
            ].map(({ key, label, type, required }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
                </label>
                <input id={key} type={type} {...field(key as keyof FormData)} />
                {errors[key as keyof FormData] && (
                  <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>
                    {errors[key as keyof FormData]?.message}
                  </p>
                )}
              </div>
            ))}

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Observações</label>
              <textarea
                {...register('bio')}
                onFocus={() => focus('bio')}
                onBlur={() => blur('bio')}
                rows={3}
                style={{ ...inputStyle(!!focused['bio'], false), height: 'auto', padding: '10px 12px', resize: 'vertical' }}
              />
            </div>

            {errors.root && (
              <div style={{ marginBottom: 16, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#b91c1c' }}>
                {errors.root.message}
              </div>
            )}

            <button type="submit" className="save-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.75s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Salvando...</>
              ) : 'Cadastrar profissional'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
