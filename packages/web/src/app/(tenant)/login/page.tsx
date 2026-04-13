'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'

const schema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'auth-spin 0.75s linear infinite', display: 'inline-block' }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}

export default function LoginPage() {
  const { login, user } = useAuth()
  const { slug } = useTenant()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (user) router.replace('/appointments')
  }, [user, router])
  const raw = searchParams.get('from') ?? '/'
  const from = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
  const [showPassword, setShowPassword] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused]   = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await login(data.email, data.password, slug)
      router.push('/appointments')
    } catch {
      setError('root', { message: 'E-mail ou senha incorretos' })
    }
  }

  const borderColor = (focused: boolean, hasError: boolean) =>
    hasError ? '#ef4444' : focused ? '#2563eb' : '#e5e7eb'

  const shadowStyle = (focused: boolean, hasError: boolean): React.CSSProperties =>
    focused
      ? { boxShadow: `0 0 0 3px ${hasError ? 'rgba(239,68,68,0.12)' : 'rgba(37,99,235,0.12)'}` }
      : {}

  return (
    <>
      <style>{`
        @keyframes auth-spin { to { transform: rotate(360deg); } }
        @keyframes auth-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes auth-slide-down {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-card { animation: auth-fade-up 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .auth-error { animation: auth-slide-down 0.2s ease both; }
        .auth-input { outline: none; }
        .auth-submit {
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
          position: relative; overflow: hidden;
        }
        .auth-submit:not(:disabled):hover {
          background: #1d4ed8 !important;
          box-shadow: 0 4px 14px rgba(37,99,235,0.35);
          transform: translateY(-1px);
        }
        .auth-submit:not(:disabled):active {
          transform: translateY(0) scale(0.98);
          box-shadow: none;
        }
        .auth-eye {
          transition: color 0.15s, transform 0.12s;
          display: flex; align-items: center;
        }
        .auth-eye:hover { color: #374151; transform: scale(1.1); }
        .auth-eye:active { transform: scale(0.9); }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-inter, Inter, sans-serif)',
      }}>
        <div className="auth-card" style={{ width: '100%', maxWidth: 440 }}>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#111827',
              margin: '0 0 8px',
              letterSpacing: '-0.015em',
              fontFamily: 'var(--font-inter, Inter, sans-serif)',
            }}>
              Bem-vindo de volta
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              Acesse sua conta para continuar
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '32px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
          }}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>

              {/* E-mail */}
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="email" style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: 6,
                }}>
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  {...register('email')}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className="auth-input"
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 12px',
                    fontSize: 14,
                    color: '#111827',
                    background: '#fff',
                    border: `1px solid ${borderColor(emailFocused, !!errors.email)}`,
                    borderRadius: 8,
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    ...shadowStyle(emailFocused, !!errors.email),
                  }}
                />
                {errors.email && (
                  <p className="auth-error" style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Senha */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                    Senha
                  </label>
                  <a
                    href="#"
                    style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    Esqueceu a senha?
                  </a>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register('password')}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                    className="auth-input"
                    style={{
                      width: '100%',
                      height: 42,
                      padding: '0 42px 0 12px',
                      fontSize: 14,
                      color: '#111827',
                      background: '#fff',
                      border: `1px solid ${borderColor(passFocused, !!errors.password)}`,
                      borderRadius: 8,
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      ...shadowStyle(passFocused, !!errors.password),
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="auth-eye"
                    style={{
                      position: 'absolute', right: 12, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', padding: 0,
                      cursor: 'pointer', color: '#9ca3af',
                    }}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {errors.password && (
                  <p className="auth-error" style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Erro global */}
              {errors.root && (
                <div className="auth-error" style={{
                  marginBottom: 16,
                  padding: '10px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#b91c1c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {errors.root.message}
                </div>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="auth-submit"
                style={{
                  width: '100%',
                  height: 42,
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.75 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontFamily: 'var(--font-inter, Inter, sans-serif)',
                }}
              >
                {isSubmitting ? <><Spinner />Entrando...</> : 'Entrar'}
              </button>

            </form>
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
            Ainda não tem conta?{' '}
            <a
              href="./register"
              style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              Cadastre-se
            </a>
          </p>

        </div>
      </div>
    </>
  )
}
