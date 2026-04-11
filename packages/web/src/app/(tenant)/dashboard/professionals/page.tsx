'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useProfessionals } from '@/hooks/useProfessionals'
import { useApi } from '@/hooks/useApi'
import { useTenant } from '@/providers/TenantProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { Professional } from '@/types'

const createSchema = z.object({
  userId: z.string().uuid('UUID inválido'),
  bio: z.string().optional(),
})

type CreateForm = z.infer<typeof createSchema>

export default function ProfessionalsPage() {
  const { data: professionals, isLoading } = useProfessionals()
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  const [open, setOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CreateForm>({ resolver: zodResolver(createSchema) })

  const createMutation = useMutation({
    mutationFn: async (data: CreateForm) => {
      const res = await api('/professionals', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals', slug] })
      reset()
      setOpen(false)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await api(`/professionals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      })
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals', slug] }),
  })

  if (isLoading) return <p className="text-gray-500">Carregando...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Profissionais</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button size="sm" />}>
            + Adicionar
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Novo profissional</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 mt-6">
              <div className="space-y-1">
                <Label>User ID</Label>
                <Input {...register('userId')} placeholder="UUID do usuário" />
                {errors.userId && <p className="text-sm text-red-500">{errors.userId.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Bio</Label>
                <Input {...register('bio')} placeholder="Especialidade, descrição..." />
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
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Bio</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {professionals?.map((prof: Professional) => (
              <tr key={prof.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{prof.id.slice(0, 8)}...</td>
                <td className="px-4 py-3">{prof.bio ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={prof.active ? 'default' : 'secondary'}>
                    {prof.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMutation.mutate({ id: prof.id, active: !prof.active })}
                    disabled={toggleMutation.isPending}
                  >
                    {prof.active ? 'Desativar' : 'Ativar'}
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
