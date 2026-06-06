'use client'

import { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { ThemeToggle } from '@/components/navigation/ThemeToggle'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/loading/Spinner'
import { EyeIcon } from '@/components/fields/EyeIcon'
import { Alert } from '@/components/feedback/Alert'
import { useOAuthPendingData } from '@/hooks/auth/useOAuthPendingData'

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google', microsoft: 'Microsoft', facebook: 'Facebook',
}

const schema = z.object({
  name:            z.string().min(2, 'Informe seu nome completo'),
  email:           z.string().email('Informe um e-mail válido'),
  password:        z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
  phone:           z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

function RegisterContent() {
  const { register: registerUser, user } = useAuth()
  const { slug }     = useTenant()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const ssoCode      = searchParams.get('sso_code')

  const { ssoData, ssoError } = useOAuthPendingData(ssoCode)

  useEffect(() => {
    if (user) router.replace('/appointments')
  }, [user, router])

  const [showPassword,    setShowPassword]    = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: ssoData
      ? { name: ssoData.name, email: ssoData.email, password: '', confirmPassword: '', phone: '' }
      : undefined,
  })

  async function onSubmit(data: FormData) {
    try {
      await registerUser(
        { name: data.name, email: data.email, password: data.password, phone: data.phone, ssoCode: ssoCode ?? undefined },
        slug,
      )
      router.push('/appointments')
    } catch {
      setError('root', { message: 'Não foi possível criar a conta. Verifique os dados e tente novamente.' })
    }
  }

  const inputCls = (hasError?: boolean) => cn(
    'w-full h-[46px] px-3.5 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border',
    hasError ? 'border-red-400' : 'border-border',
  )

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-6">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-3 duration-300">

        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-foreground m-0 mb-2 tracking-[-0.015em]">Crie sua conta</h1>
          {ssoData ? (
            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-3 py-1 text-xs font-semibold dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Continuando com {PROVIDER_LABEL[ssoData.provider] ?? ssoData.provider}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground m-0">Preencha os dados para se cadastrar</p>
          )}
        </div>

        {ssoError && (
          <Alert variant="error" className="mb-5">
            Link expirado. <a href="./login" className="underline font-medium">Tente novamente</a> pelo login social.
          </Alert>
        )}

        <div className="bg-card rounded-xl p-8 border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* Nome */}
            <div className="mb-4">
              <label htmlFor="name" className="block text-[13px] font-medium text-foreground mb-1.5">Nome completo</label>
              <input id="name" type="text" placeholder="Seu nome" autoComplete="name"
                {...register('name')} className={inputCls(!!errors.name)} />
              {errors.name && <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1.5 duration-200">{errors.name.message}</p>}
            </div>

            {/* E-mail */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-[13px] font-medium text-foreground mb-1.5">E-mail</label>
              <input
                id="email" type="email" placeholder="seu@email.com" autoComplete="email"
                {...register('email')}
                disabled={!!ssoData}
                className={cn(inputCls(!!errors.email), ssoData && 'opacity-60 cursor-not-allowed bg-muted')}
              />
              {ssoData && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Este e-mail vem do {PROVIDER_LABEL[ssoData.provider]} e não pode ser alterado
                </p>
              )}
              {errors.email && <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1.5 duration-200">{errors.email.message}</p>}
            </div>

            {/* Telefone */}
            <div className="mb-4">
              <label htmlFor="phone" className="block text-[13px] font-medium text-foreground mb-1.5">
                Telefone <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
              </label>
              <input id="phone" type="tel" placeholder="(11) 99999-9999" autoComplete="tel"
                {...register('phone')} className={inputCls()} />
            </div>

            {/* Senha */}
            <div className="mb-4">
              <label htmlFor="password" className="block text-[13px] font-medium text-foreground mb-1.5">
                {ssoData ? 'Crie uma senha' : 'Senha'}
              </label>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password" {...register('password')}
                  className={cn(inputCls(!!errors.password), 'pr-[42px]')} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground hover:text-foreground hover:scale-110 active:scale-90 transition-all bg-transparent border-0 p-0 cursor-pointer"
                  aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1.5 duration-200">{errors.password.message}</p>}
            </div>

            {/* Confirmar senha */}
            <div className="mb-5">
              <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-foreground mb-1.5">Confirmar senha</label>
              <div className="relative">
                <input id="confirmPassword" type={showConfirmPass ? 'text' : 'password'} placeholder="Repita a senha"
                  autoComplete="new-password" {...register('confirmPassword')}
                  className={cn(inputCls(!!errors.confirmPassword), 'pr-[42px]')} />
                <button type="button" onClick={() => setShowConfirmPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground hover:text-foreground hover:scale-110 active:scale-90 transition-all bg-transparent border-0 p-0 cursor-pointer"
                  aria-label={showConfirmPass ? 'Ocultar' : 'Mostrar'}>
                  <EyeIcon open={showConfirmPass} />
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1.5 duration-200">{errors.confirmPassword.message}</p>}
            </div>

            {errors.root && <Alert variant="error" size="sm" className="mb-4">{errors.root.message}</Alert>}

            <button type="submit" disabled={isSubmitting}
              className="w-full h-[46px] bg-blue-600 text-white font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-65 disabled:cursor-not-allowed transition-all">
              {isSubmitting
                ? <><Spinner />Criando conta...</>
                : ssoData ? `Criar conta e vincular ${PROVIDER_LABEL[ssoData.provider]}` : 'Criar conta'
              }
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-[13px] text-muted-foreground">
          Já tem uma conta?{' '}
          <a href="./login" className="text-blue-600 font-semibold no-underline hover:underline">Entrar</a>
        </p>

      </div>
    </div>
  )
}

export default function RegisterPage() {
  return <Suspense><RegisterContent /></Suspense>
}
