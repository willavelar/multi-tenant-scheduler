'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter } from 'next/navigation'
import { useSuperAdminAuth } from '@/providers/SuperAdminAuthProvider'
import { cn } from '@/lib/utils'
import { SuperAdminApiError } from '@/lib/super-admin-api'

const schema = z.object({
  email:    z.string().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
})

type FormData = z.infer<typeof schema>

export default function SuperAdminLoginPage() {
  const { login, user } = useSuperAdminAuth()
  const router = useRouter()

  // If already authenticated, redirect to tenants list
  useEffect(() => {
    if (user) router.replace('/_admin/tenants')
  }, [user, router])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await login(data.email, data.password)
      router.replace('/_admin/tenants')
    } catch (err) {
      if (err instanceof SuperAdminApiError && err.status === 401) {
        setError('root', { message: 'Email ou senha inválidos' })
      } else {
        setError('root', { message: 'Erro ao fazer login. Tente novamente.' })
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Super Admin</h1>
          <p className="text-sm text-muted-foreground">Acesso restrito à plataforma</p>
        </div>

        <div className="bg-card rounded-xl p-8 border border-border shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                {...register('email')}
                className={cn(
                  'w-full h-11 px-3.5 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-muted-foreground',
                  errors.email ? 'border-destructive' : 'border-border',
                )}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className={cn(
                  'w-full h-11 px-3.5 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-muted-foreground',
                  errors.password ? 'border-destructive' : 'border-border',
                )}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {errors.root.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-blue-600 text-white font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center hover:bg-blue-700 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
