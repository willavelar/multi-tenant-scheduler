'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/hooks/useServices'
import { useApi } from '@/hooks/useApi'
import { useTenant } from '@/providers/TenantProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { Service } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  durationMinutes: z.coerce.number().int().min(1, 'Duração mínima: 1 minuto'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function ServicesPage() {
  const { data: services, isLoading, isError } = useServices()
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  const [open, setOpen] = useState(false)
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api('/services', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', slug] })
      reset()
      setOpen(false)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      setPendingToggleId(id)
      const res = await api(`/services/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      })
      return res.json()
    },
    onSettled: () => setPendingToggleId(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services', slug] }),
  })

  if (isLoading) return <p className="text-gray-500">Carregando...</p>
  if (isError) return <p className="text-red-500">Erro ao carregar serviços.</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Serviços</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button size="sm" />}>
            + Adicionar
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Novo serviço</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 mt-6">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input {...register('name')} placeholder="Ex: Consulta" />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Duração (minutos)</Label>
                <Input type="number" {...register('durationMinutes')} placeholder="60" />
                {errors.durationMinutes && <p className="text-sm text-red-500">{errors.durationMinutes.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Input {...register('description')} placeholder="Descrição opcional" />
              </div>
              {createMutation.error && (
                <p className="text-sm text-red-500">
                  {createMutation.error instanceof Error ? createMutation.error.message : 'Erro'}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting || createMutation.isPending}>
                Salvar
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="rounded-md border bg-white">
        <table className="w-full text-sm" aria-label="Serviços">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Duração</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!services?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">
                  Nenhum serviço cadastrado.
                </td>
              </tr>
            )}
            {services?.map((svc: Service) => (
              <tr key={svc.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{svc.name}</td>
                <td className="px-4 py-3 text-gray-500">{svc.durationMinutes} min</td>
                <td className="px-4 py-3">
                  <Badge variant={svc.active ? 'default' : 'secondary'}>
                    {svc.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMutation.mutate({ id: svc.id, active: !svc.active })}
                    disabled={pendingToggleId === svc.id}
                  >
                    {svc.active ? 'Desativar' : 'Ativar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
