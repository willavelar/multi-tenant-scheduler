'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useSuperAdminAuth } from '@/providers/SuperAdminAuthProvider'
import { SuperAdminApiError } from '@/lib/super-admin-api'
import { cn } from '@/lib/utils'

const schema = z.object({
  email:    z.string().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
})

type FormData = z.infer<typeof schema>

export default function SuperAdminLoginPage() {
  const { login } = useSuperAdminAuth()
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    try {
      await login(data.email, data.password)
    } catch (err) {
      setError(err instanceof SuperAdminApiError && err.status === 401
        ? 'Credenciais inválidas'
        : 'Erro inesperado. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 border rounded-xl bg-card shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Acesso restrito</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">E-mail</label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                errors.email && 'border-destructive',
              )}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Senha</label>
            <input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                errors.password && 'border-destructive',
              )}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
