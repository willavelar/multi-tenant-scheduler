'use client'

import { useSuperAdminAuth } from '@/providers/SuperAdminAuthProvider'
import { SuperAdminApiError } from '@/lib/super-admin-api'
import { LoginCard, type LoginCardData } from '@/components/auth/LoginCard'

export default function SuperAdminLoginPage() {
  const { login } = useSuperAdminAuth()

  async function handleLogin(data: LoginCardData) {
    try {
      await login(data.email, data.password)
    } catch (err) {
      throw new Error(
        err instanceof SuperAdminApiError && err.status === 401
          ? 'Credenciais inválidas'
          : 'Erro inesperado. Tente novamente.',
      )
    }
  }

  return (
    <LoginCard
      title="Admin Panel"
      subtitle="Acesso restrito"
      onSubmit={handleLogin}
      passwordMinLength={1}
    />
  )
}
