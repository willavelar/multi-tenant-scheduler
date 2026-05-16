'use client'

import { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { EyeIcon } from '@/components/ui/EyeIcon'
import { Alert } from '@/components/ui/Alert'

const schema = z.object({
  email:    z.string().email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function resolveReturnTo(searchParams: ReturnType<typeof useSearchParams>): string {
  const urlFrom = searchParams.get('from')
  if (typeof window === 'undefined') return urlFrom ?? '/appointments'
  const stored = sessionStorage.getItem('session.returnTo')
  if (stored) sessionStorage.removeItem('session.returnTo')
  const candidate = stored ?? urlFrom ?? '/appointments'
  return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/appointments'
}

// ── SSO Icons ─────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

const MicrosoftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 23 23">
    <path fill="#f25022" d="M0 0h11v11H0z"/>
    <path fill="#00a4ef" d="M12 0h11v11H12z"/>
    <path fill="#7fba00" d="M0 12h11v11H0z"/>
    <path fill="#ffb900" d="M12 12h11v11H12z"/>
  </svg>
)

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877f2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

function SSOButtons({ slug, returnTo }: { slug: string; returnTo: string }) {
  function handleSSO(provider: 'google' | 'microsoft' | 'facebook') {
    window.location.href =
      `${API_URL}/auth/oauth/${provider}?slug=${encodeURIComponent(slug)}&returnTo=${encodeURIComponent(returnTo)}`
  }

  const btnCls = cn(
    'w-full flex items-center gap-3 px-4 h-11.5 rounded-lg border border-border bg-background',
    'text-sm font-medium text-foreground cursor-pointer',
    'hover:bg-accent hover:border-border/80 transition-colors',
  )

  return (
    <div className="flex flex-col gap-2.5 mb-5">
      <button type="button" className={btnCls} onClick={() => handleSSO('google')}>
        <GoogleIcon /><span>Continuar com Google</span>
      </button>
      <button type="button" className={btnCls} onClick={() => handleSSO('microsoft')}>
        <MicrosoftIcon /><span>Continuar com Microsoft</span>
      </button>
      <button type="button" className={btnCls} onClick={() => handleSSO('facebook')}>
        <FacebookIcon /><span className="text-[#1877f2]">Continuar com Facebook</span>
      </button>
    </div>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium">ou entre com e-mail</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ── Login Content ─────────────────────────────────────────────────────────

function LoginContent() {
  const { login, user } = useAuth()
  const { slug }        = useTenant()
  const router          = useRouter()
  const searchParams    = useSearchParams()
  const reason          = searchParams.get('reason')
  const provider        = searchParams.get('provider')

  useEffect(() => {
    if (user) router.replace('/appointments')
  }, [user, router])

  const [showPassword, setShowPassword] = useState(false)
  const returnTo = resolveReturnTo(searchParams)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await login(data.email, data.password, slug)
      router.push(returnTo)
    } catch {
      setError('root', { message: 'E-mail ou senha incorretos' })
    }
  }

  const providerLabel: Record<string, string> = {
    google: 'Google', microsoft: 'Microsoft', facebook: 'Facebook',
  }

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-6">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-110 animate-in fade-in slide-in-from-bottom-3 duration-300">

        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-foreground m-0 mb-2 tracking-[-0.015em]">Bem-vindo de volta</h1>
          <p className="text-sm text-muted-foreground m-0">Acesse sua conta para continuar</p>
        </div>

        {reason === 'session_expired' && (
          <Alert variant="warning" className="mb-5">Sua sessão expirou. Faça login para continuar.</Alert>
        )}
        {reason === 'password_reset' && (
          <Alert variant="success" className="mb-5">Senha alterada com sucesso. Faça login para continuar.</Alert>
        )}
        {reason === 'account_activated' && (
          <Alert variant="success" className="mb-5">Senha cadastrada com sucesso. Faça login para continuar.</Alert>
        )}
        {reason === 'oauth_error' && (
          <Alert variant="error" className="mb-5">Não foi possível autenticar com o provedor. Tente novamente.</Alert>
        )}
        {reason === 'oauth_unverified' && (
          <Alert variant="warning" className="mb-5">
            Seu e-mail no provedor não está verificado. Verifique-o e tente novamente.
          </Alert>
        )}
        {reason === 'sso_email_exists' && provider && (
          <Alert variant="warning" className="mb-5">
            Você já tem conta com este e-mail. Entre com sua senha e vincule o{' '}
            {providerLabel[provider] ?? provider} nas configurações do perfil.
          </Alert>
        )}

        <div className="bg-card rounded-xl p-8 border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">
          <SSOButtons slug={slug} returnTo={returnTo} />
          <Divider />

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-4.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-foreground mb-1.5">E-mail</label>
              <input
                id="email" type="email" placeholder="seu@email.com" autoComplete="email" tabIndex={1}
                {...register('email')}
                className={cn(
                  'w-full h-11.5 px-3.5 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border placeholder:text-muted-foreground',
                  errors.email ? 'border-destructive' : 'border-border',
                )}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1.5 duration-200">{errors.email.message}</p>
              )}
            </div>

            <div className="mb-5">
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="text-[13px] font-medium text-foreground">Senha</label>
                <a href="./forgot-password" tabIndex={4} className="text-xs text-muted-foreground no-underline hover:text-foreground underline-offset-4 hover:underline">
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  autoComplete="current-password" tabIndex={2}
                  {...register('password')}
                  className={cn(
                    'w-full h-11.5 pl-3.5 pr-10.5 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border placeholder:text-muted-foreground',
                    errors.password ? 'border-destructive' : 'border-border',
                  )}
                />
                <button
                  type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground hover:text-foreground hover:scale-110 active:scale-90 transition-all bg-transparent border-0 p-0 cursor-pointer"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1.5 duration-200">{errors.password.message}</p>
              )}
            </div>

            {errors.root && <Alert variant="error" size="sm" className="mb-4">{errors.root.message}</Alert>}

            <button
              type="submit" tabIndex={3} disabled={isSubmitting}
              className="w-full h-11.5 bg-blue-600 text-white font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-65 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? <><Spinner />Entrando...</> : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-[13px] text-muted-foreground">
          Ainda não tem conta?{' '}
          <a href="./register" className="text-blue-600 font-semibold no-underline hover:underline">Cadastre-se</a>
        </p>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>
}
