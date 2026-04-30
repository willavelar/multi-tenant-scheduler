'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useTenant } from '@/providers/TenantProvider'
import { apiFetch, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const schema = z.object({
  email: z.string().min(1, 'Informe seu e-mail').email('Informe um e-mail válido'),
})

type FormData = z.infer<typeof schema>

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}

export default function ForgotPasswordPage() {
  const { slug } = useTenant()
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await apiFetch('/auth/forgot-password', {
        slug,
        method: 'POST',
        body: JSON.stringify({ email: data.email }),
      })
      setSubmitted(true)
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        // treat 4xx as success too — don't leak whether the email exists
        setSubmitted(true)
      } else {
        setError('root', { message: 'Ocorreu um erro. Tente novamente.' })
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-3 duration-300">

        {/* Heading */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-gray-900 m-0 mb-2 tracking-[-0.015em]">
            Esqueceu a senha?
          </h1>
          <p className="text-sm text-gray-500 m-0">
            Informe seu e-mail para receber o link de redefinição
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">

          {submitted ? (
            /* Success state */
            <div className="flex flex-col items-center gap-3 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              </div>
              <p className="text-sm text-gray-700 text-center leading-relaxed">
                Se este e-mail estiver cadastrado, você receberá um link de redefinição em breve.
              </p>
            </div>
          ) : (
            /* Form state */
            <form onSubmit={handleSubmit(onSubmit)} noValidate>

              {/* E-mail */}
              <div className="mb-5">
                <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  {...register('email')}
                  className={cn(
                    'w-full h-[46px] px-3.5 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border',
                    errors.email ? 'border-red-400' : 'border-gray-200',
                  )}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1.5 duration-200">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Erro global */}
              {errors.root && (
                <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-1.5 duration-200">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
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
                className="w-full h-[46px] bg-blue-600 text-white font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-65 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? <><Spinner />Enviando...</> : 'Enviar link de redefinição'}
              </button>

            </form>
          )}

        </div>

        {/* Footer */}
        <p className="text-center mt-5 text-[13px] text-gray-500">
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
