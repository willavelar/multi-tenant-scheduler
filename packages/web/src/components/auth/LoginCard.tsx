'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/loading/Spinner'
import { EyeIcon } from '@/components/fields/EyeIcon'
import { Alert } from '@/components/feedback/Alert'
import { ThemeToggle } from '@/components/navigation/ThemeToggle'

export type LoginCardData = { email: string; password: string }

type Props = {
  title: string
  subtitle?: string
  logo?: React.ReactNode
  onSubmit: (data: LoginCardData) => Promise<void>
  passwordMinLength?: number
  showThemeToggle?: boolean
  showForgotPassword?: boolean
  forgotPasswordHref?: string
  alertsSlot?: React.ReactNode
  ssoSlot?: React.ReactNode
  footer?: React.ReactNode
}

export function LoginCard({
  title,
  subtitle,
  logo,
  onSubmit,
  passwordMinLength = 6,
  showThemeToggle = true,
  showForgotPassword = false,
  forgotPasswordHref = './forgot-password',
  alertsSlot,
  ssoSlot,
  footer,
}: Props) {
  const [showPassword, setShowPassword] = useState(false)

  const schema = useMemo(() =>
    z.object({
      email: z.string().email('Informe um e-mail válido'),
      password: z.string().min(
        passwordMinLength,
        passwordMinLength > 1
          ? `A senha deve ter no mínimo ${passwordMinLength} caracteres`
          : 'Informe a senha',
      ),
    }),
  [passwordMinLength])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginCardData>({ resolver: zodResolver(schema) })

  async function handleFormSubmit(data: LoginCardData) {
    try {
      await onSubmit(data)
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.',
      })
    }
  }

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-6">
      {showThemeToggle && (
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
      )}

      <div className="w-full max-w-110 animate-in fade-in slide-in-from-bottom-3 duration-300">
        <div className="text-center mb-7">
          {logo && <div className="flex justify-center mb-5">{logo}</div>}
          <h1 className="text-xl font-bold text-foreground m-0 mb-2 tracking-[-0.015em]">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground m-0">{subtitle}</p>}
        </div>

        {alertsSlot}

        <div className="bg-card rounded-xl p-8 border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">
          <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
            <div className="mb-4.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-foreground mb-1.5">
                E-mail
              </label>
              <input
                id="email" type="email" placeholder="seu@email.com"
                autoComplete="email" tabIndex={1}
                {...register('email')}
                className={cn(
                  'w-full h-11.5 px-3.5 text-sm text-foreground bg-background rounded-lg border outline-none',
                  'transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border placeholder:text-muted-foreground',
                  errors.email ? 'border-destructive' : 'border-border',
                )}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1.5 duration-200">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="mb-5">
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="text-[13px] font-medium text-foreground">
                  Senha
                </label>
                {showForgotPassword && (
                  <a
                    href={forgotPasswordHref} tabIndex={4}
                    className="text-xs text-muted-foreground no-underline hover:text-foreground underline-offset-4 hover:underline"
                  >
                    Esqueceu a senha?
                  </a>
                )}
              </div>
              <div className="relative">
                <input
                  id="password" type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••" autoComplete="current-password" tabIndex={2}
                  {...register('password')}
                  className={cn(
                    'w-full h-11.5 pl-3.5 pr-10.5 text-sm text-foreground bg-background rounded-lg border outline-none',
                    'transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border placeholder:text-muted-foreground',
                    errors.password ? 'border-destructive' : 'border-border',
                  )}
                />
                <button
                  type="button" tabIndex={-1}
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

            {errors.root && (
              <Alert variant="error" size="sm" className="mb-4">{errors.root.message}</Alert>
            )}

            <button
              type="submit" tabIndex={3} disabled={isSubmitting}
              className="w-full h-11.5 bg-blue-600 text-white font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-65 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? <><Spinner />Entrando...</> : 'Entrar'}
            </button>
          </form>

          {ssoSlot}
        </div>

        {footer && (
          <p className="text-center mt-5 text-[13px] text-muted-foreground">{footer}</p>
        )}
      </div>
    </div>
  )
}
