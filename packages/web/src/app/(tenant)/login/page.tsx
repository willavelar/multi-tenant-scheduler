'use client'

import { useState } from 'react'
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const { slug } = useTenant()
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get('from') ?? '/'
  const from = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
  const [showPassword, setShowPassword] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const emailVal = watch('email') ?? ''
  const passVal  = watch('password') ?? ''

  async function onSubmit(data: FormData) {
    try {
      const token = await login(data.email, data.password, slug)
      const { jwtDecode } = await import('jwt-decode')
      const payload = jwtDecode<{ role: string }>(token)
      if (payload.role === 'client') {
        router.push('/appointments')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('root', { message: 'E-mail ou senha incorretos' })
    }
  }

  const emailActive = emailFocused || emailVal.length > 0
  const passActive  = passFocused  || passVal.length > 0

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-input:focus {
          outline: none;
        }
        .login-btn {
          position: relative;
          overflow: hidden;
          transition: background 0.2s, transform 0.12s, box-shadow 0.2s;
        }
        .login-btn:not(:disabled):hover {
          background: #1c2433 !important;
          box-shadow: 0 6px 20px rgba(14,17,23,0.35);
          transform: translateY(-1px);
        }
        .login-btn:not(:disabled):active {
          transform: translateY(0px) scale(0.98);
          box-shadow: 0 2px 8px rgba(14,17,23,0.2);
        }
        .login-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .login-btn:not(:disabled):active::after {
          opacity: 1;
        }
        .eye-btn {
          transition: color 0.2s, transform 0.15s;
        }
        .eye-btn:hover {
          color: #0e1117;
          transform: scale(1.1);
        }
        .eye-btn:active {
          transform: scale(0.92);
        }
        .card-wrap {
          animation: fadeUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .error-msg {
          animation: slideDown 0.22s ease both;
        }
        .field-label {
          transition: color 0.2s, font-size 0.2s, top 0.2s;
          pointer-events: none;
          position: absolute;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#f2efe9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-inter, sans-serif)',
        padding: '24px',
      }}>
        <div className="card-wrap" style={{ width: '100%', maxWidth: 420 }}>

          {/* Logo / Brand mark */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              background: '#0e1117',
              borderRadius: 10,
              marginBottom: 20,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="#e8960a" strokeWidth="2"/>
                <path d="M8 9h8M8 13h5" stroke="#e8960a" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-playfair, Georgia, serif)',
              fontSize: 26,
              fontWeight: 700,
              color: '#0e1117',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}>
              Bem-vindo de volta
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#7a7165' }}>
              Acesse sua conta para continuar
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '36px 36px 32px',
            boxShadow: '0 2px 4px rgba(14,17,23,0.04), 0 8px 32px rgba(14,17,23,0.08)',
          }}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>

              {/* E-mail */}
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="email" style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: emailFocused ? '#0e1117' : '#4a4540',
                  marginBottom: 6,
                  transition: 'color 0.2s',
                  letterSpacing: '0.01em',
                }}>
                  E-mail
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    {...register('email')}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    className="login-input"
                    style={{
                      width: '100%',
                      height: 44,
                      padding: '0 14px',
                      fontSize: 14,
                      color: '#0e1117',
                      background: emailFocused ? '#fff' : '#faf9f7',
                      border: `1.5px solid ${errors.email ? '#e53935' : emailFocused ? '#0e1117' : '#e2ddd6'}`,
                      borderRadius: 8,
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                      boxShadow: emailFocused && !errors.email ? '0 0 0 3px rgba(14,17,23,0.07)' : 'none',
                    }}
                  />
                </div>
                {errors.email && (
                  <p className="error-msg" style={{ margin: '6px 0 0', fontSize: 12, color: '#e53935' }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Senha */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label htmlFor="password" style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: passFocused ? '#0e1117' : '#4a4540',
                    transition: 'color 0.2s',
                    letterSpacing: '0.01em',
                  }}>
                    Senha
                  </label>
                  <a href="#" style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#e8960a',
                    textDecoration: 'none',
                    letterSpacing: '0.01em',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
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
                    className="login-input"
                    style={{
                      width: '100%',
                      height: 44,
                      padding: '0 44px 0 14px',
                      fontSize: 14,
                      color: '#0e1117',
                      background: passFocused ? '#fff' : '#faf9f7',
                      border: `1.5px solid ${errors.password ? '#e53935' : passFocused ? '#0e1117' : '#e2ddd6'}`,
                      borderRadius: 8,
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                      boxShadow: passFocused && !errors.password ? '0 0 0 3px rgba(14,17,23,0.07)' : 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="eye-btn"
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#9e9589',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {errors.password && (
                  <p className="error-msg" style={{ margin: '6px 0 0', fontSize: 12, color: '#e53935' }}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Erro global */}
              {errors.root && (
                <div className="error-msg" style={{
                  margin: '16px 0 0',
                  padding: '10px 14px',
                  background: '#fff5f5',
                  border: '1.5px solid #fca5a5',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#c53030',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
                className="login-btn"
                style={{
                  marginTop: 24,
                  width: '100%',
                  height: 46,
                  background: '#0e1117',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'opacity 0.2s',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Spinner />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>

            </form>
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#7a7165' }}>
            Ainda não tem conta?{' '}
            <a href="./register" style={{
              fontWeight: 700,
              color: '#0e1117',
              textDecoration: 'none',
              borderBottom: '1.5px solid #e8960a',
              paddingBottom: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e8960a')}
            onMouseLeave={e => (e.currentTarget.style.color = '#0e1117')}>
              Cadastre-se
            </a>
          </p>

        </div>
      </div>
    </>
  )
}
