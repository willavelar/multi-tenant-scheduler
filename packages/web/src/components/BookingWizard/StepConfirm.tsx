'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useFormatTime } from '@/hooks/useFormatTime'
import { useBookingConfirm } from './useBookingConfirm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

type Props = {
  professionalId: string
  serviceId: string
  date: string
  startTime: string
  onBack: () => void
  onDone: () => void
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  phone: z.string().optional(),
})

export function StepConfirm({ professionalId, serviceId, date, startTime, onBack, onDone }: Props) {
  const { user, login, register: registerUser } = useAuth()
  const { slug } = useTenant()
  const { formatTime } = useFormatTime()
  const [showAuth, setShowAuth] = useState(false)
  const { bookMutation, bookWithToken, result, bookError } = useBookingConfirm({ professionalId, serviceId, date, startTime })

  const loginForm = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) })

  async function handleConfirm() {
    if (!user) {
      setShowAuth(true)
      return
    }
    bookMutation.mutate()
  }

  async function handleLogin(data: z.infer<typeof loginSchema>) {
    try {
      const freshToken = await login(data.email, data.password, slug)
      setShowAuth(false)
      await bookWithToken(freshToken)
    } catch (err) {
      loginForm.setError('root', {
        message: 'Email ou senha incorretos',
      })
    }
  }

  async function handleRegister(data: z.infer<typeof registerSchema>) {
    try {
      const freshToken = await registerUser(data, slug)
      setShowAuth(false)
      await bookWithToken(freshToken)
    } catch (err) {
      registerForm.setError('root', {
        message: err instanceof Error ? err.message : 'Erro ao criar conta',
      })
    }
  }

  if (result) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-4xl">✅</div>
        <h2 className="text-xl font-semibold">Agendamento realizado!</h2>
        <Badge variant={result.status === 'confirmed' ? 'default' : 'secondary'}>
          {result.status === 'confirmed' ? 'Confirmado' : 'Aguardando confirmação'}
        </Badge>
        <p className="text-sm text-muted-foreground">{date} às {formatTime(startTime)}</p>
        <Button variant="secondary" onClick={onDone}>
          Fazer outro agendamento
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Confirmar agendamento</h2>
      <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Data</span>
          <span className="font-medium">{date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Horário</span>
          <span className="font-medium">{formatTime(startTime)}</span>
        </div>
      </div>

      {(bookMutation.error || bookError) && (
        <p className="text-sm text-red-500">
          {bookError ?? (bookMutation.error instanceof Error ? bookMutation.error.message : 'Erro ao agendar')}
        </p>
      )}

      <Button
        variant="primary"
        className="w-full"
        onClick={handleConfirm}
        loading={bookMutation.isPending}
      >
        {bookMutation.isPending ? 'Agendando...' : user ? 'Confirmar' : 'Entrar e confirmar'}
      </Button>
      <button onClick={onBack} className="text-sm text-muted-foreground hover:underline block mx-auto">
        ← Voltar
      </button>

      <Dialog open={showAuth} onOpenChange={(open) => setShowAuth(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acesse sua conta para continuar</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Entrar</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-3 mt-2">
                <div>
                  <Label>Email</Label>
                  <Input type="email" {...loginForm.register('email')} />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input type="password" {...loginForm.register('password')} />
                </div>
                {loginForm.formState.errors.root && (
                  <p className="text-sm text-red-500">{loginForm.formState.errors.root.message}</p>
                )}
                <Button variant="primary" type="submit" className="w-full" loading={loginForm.formState.isSubmitting}>
                  Entrar
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-3 mt-2">
                <div>
                  <Label>Nome</Label>
                  <Input {...registerForm.register('name')} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" {...registerForm.register('email')} />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input type="password" {...registerForm.register('password')} />
                </div>
                {registerForm.formState.errors.root && (
                  <p className="text-sm text-red-500">{registerForm.formState.errors.root.message}</p>
                )}
                <Button variant="primary" type="submit" className="w-full" loading={registerForm.formState.isSubmitting}>
                  Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
