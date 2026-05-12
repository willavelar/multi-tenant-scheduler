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
import { Spinner } from "@/components/ui/Spinner";
import { EyeIcon } from "@/components/ui/EyeIcon";
import { Alert } from '@/components/ui/Alert'

const schema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

function resolveReturnTo(searchParams: ReturnType<typeof useSearchParams>): string {
  const stored = sessionStorage.getItem('session.returnTo')
  if (stored) sessionStorage.removeItem('session.returnTo')
  const urlFrom = searchParams.get('from')
  const candidate = stored ?? urlFrom ?? '/appointments'
  return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/appointments'
}

function LoginContent() {
  const { login, user } = useAuth()
  const { slug } = useTenant()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  useEffect(() => {
    if (user) router.replace('/appointments')
  }, [user, router])

  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await login(data.email, data.password, slug)
      router.push(resolveReturnTo(searchParams))
    } catch {
      setError('root', { message: 'E-mail ou senha incorretos' })
    }
  }

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-6">

      {/* Theme toggle — top-right corner */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-110 animate-in fade-in slide-in-from-bottom-3 duration-300">

        {/* Heading */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-foreground m-0 mb-2 tracking-[-0.015em]">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-muted-foreground m-0">
            Acesse sua conta para continuar
          </p>
        </div>

        {/* Banner de sessão expirada */}
        {reason === 'session_expired' && (
          <Alert variant="warning" className="mb-5">
            Sua sessão expirou. Faça login para continuar.
          </Alert>
        )}

        {/* Banner de senha alterada */}
        {reason === 'password_reset' && (
          <Alert variant="success" className="mb-5">
            Senha alterada com sucesso. Faça login para continuar.
          </Alert>
        )}

        {/* Banner de conta ativada */}
        {reason === 'account_activated' && (
          <Alert variant="success" className="mb-5">
            Senha cadastrada com sucesso. Faça login para continuar.
          </Alert>
        )}

        {/* Card */}
        <div className="bg-card rounded-xl p-8 border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* E-mail */}
            <div className="mb-4.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-foreground mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                {...register('email')}
                className={cn(
                  'w-full h-11.5 px-3.5 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border placeholder:text-muted-foreground',
                  errors.email ? 'border-destructive' : 'border-border',
                )}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1.5 duration-200">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Senha */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="text-[13px] font-medium text-foreground">
                  Senha
                </label>
                <a
                  href="./forgot-password"
                  className="text-xs text-muted-foreground no-underline hover:text-foreground underline-offset-4 hover:underline"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                  className={cn(
                    'w-full h-11.5 pl-3.5 pr-10.5 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border placeholder:text-muted-foreground',
                    errors.password ? 'border-destructive' : 'border-border',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground hover:text-foreground hover:scale-110 active:scale-90 transition-all bg-transparent border-0 p-0 cursor-pointer"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1.5 duration-200">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Erro global */}
            {errors.root && (
              <Alert variant="error" size="sm" className="mb-4">
                {errors.root.message}
              </Alert>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11.5 bg-blue-600 text-white font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-65 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? <><Spinner />Entrando...</> : 'Entrar'}
            </button>

          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-5 text-[13px] text-muted-foreground">
          Ainda não tem conta?{' '}
          <a
            href="./register"
            className="text-blue-600 font-semibold no-underline hover:underline"
          >
            Cadastre-se
          </a>
        </p>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
