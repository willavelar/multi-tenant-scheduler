'use client'

import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTenant } from '@/providers/TenantProvider'
import { apiFetch, ApiError } from '@/lib/api'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'
import {Spinner} from "@/components/ui/Spinner";
import {EyeIcon} from "@/components/ui/EyeIcon";
import { Alert } from '@/components/ui/Alert';
import { useValidateToken } from '@/hooks/auth/useValidateToken'

const schema = z
  .object({
    newPassword: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

function ResetPasswordContent() {
  const { slug } = useTenant()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const pageState = useValidateToken(token, '/auth/reset-password/validate')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    if (!token) return
    clearErrors('root')
    try {
      await apiFetch('/auth/reset-password', {
        slug,
        method: 'POST',
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      })
      router.push('./login?reason=password_reset')
    } catch (err) {
      const message =
        err instanceof ApiError && err.status < 500
          ? 'Link inválido ou expirado. Solicite um novo link.'
          : 'Ocorreu um erro. Tente novamente.'
      setError('root', { message })
    }
  }

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-3 duration-300">

        {/* Heading */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-foreground m-0 mb-2 tracking-[-0.015em]">
            Redefinir senha
          </h1>
          <p className="text-sm text-muted-foreground m-0">
            {pageState.status === 'loading'
              ? 'Verificando link...'
              : pageState.status === 'valid'
                ? 'Crie uma nova senha para sua conta'
                : 'Link inválido'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl p-8 border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">

          {pageState.status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Spinner />
              <p className="text-sm text-muted-foreground">Verificando link de redefinição...</p>
            </div>
          )}

          {pageState.status === 'invalid' && (
            <div className="flex flex-col items-center gap-3 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-500/20 flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-red-500"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-sm text-foreground text-center leading-relaxed">
                Link inválido ou expirado. Solicite um novo link de redefinição de senha.
              </p>
              <a
                href="./forgot-password"
                className="text-blue-600 font-semibold text-sm no-underline hover:underline"
              >
                Solicitar novo link
              </a>
            </div>
          )}

          {pageState.status === 'valid' && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >

              {/* E-mail (disabled, informational) */}
              <div className="mb-4.5">
                <label htmlFor="email" className="block text-[13px] font-medium text-foreground mb-1.5">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={pageState.email}
                  disabled
                  className="w-full h-[46px] px-3.5 text-sm text-muted-foreground bg-muted rounded-lg border border-border outline-none cursor-not-allowed box-border"
                />
              </div>

              {/* Nova senha */}
              <div className="mb-4.5">
                <label htmlFor="newPassword" className="block text-[13px] font-medium text-foreground mb-1.5">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register('newPassword')}
                    className={cn(
                      'w-full h-[46px] pl-3.5 pr-[42px] text-sm text-foreground bg-background rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border',
                      errors.newPassword ? 'border-red-400' : 'border-border',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground hover:text-foreground hover:scale-110 active:scale-90 transition-all bg-transparent border-0 p-0 cursor-pointer"
                    aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <EyeIcon open={showNewPassword} />
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1.5 duration-200">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirmar nova senha */}
              <div className="mb-5">
                <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-foreground mb-1.5">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    className={cn(
                      'w-full h-[46px] pl-3.5 pr-[42px] text-sm text-foreground bg-background rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border',
                      errors.confirmPassword ? 'border-red-400' : 'border-border',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground hover:text-foreground hover:scale-110 active:scale-90 transition-all bg-transparent border-0 p-0 cursor-pointer"
                    aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                  >
                    <EyeIcon open={showConfirmPassword} />
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1.5 duration-200">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Erro global */}
              {errors.root && (
                <Alert variant="error" size="sm" className="mb-4">{errors.root.message}</Alert>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[46px] bg-blue-600 text-white font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-65 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? <><Spinner />Redefinindo...</> : 'Redefinir senha'}
              </button>

            </form>
          )}

        </div>

        {/* Footer */}
        <p className="text-center mt-5 text-[13px] text-muted-foreground">
          Lembrou a senha?{' '}
          <a
            href="./login"
            className="text-blue-600 font-semibold no-underline hover:underline"
          >
            Entrar
          </a>
        </p>

      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  )
}
