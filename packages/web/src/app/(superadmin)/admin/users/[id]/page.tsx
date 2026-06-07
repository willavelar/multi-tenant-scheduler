'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { getSuperAdminUser, updateSuperAdminUser } from '@/lib/super-admin-api'
import { useSuperAdminAuth } from '@/providers/SuperAdminAuthProvider'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/feedback/StatusBadge'
import { DetailHeader } from '@/components/sections/DetailHeader'
import { DetailIdentity } from '@/components/sections/DetailIdentity'
import { DetailCard } from '@/components/sections/DetailCard'
import { FieldRow } from '@/components/data-display/FieldRow'

export default function SuperAdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user: me } = useSuperAdminAuth()
  const isSelf = me?.id === id

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['sa-user', id],
    queryFn: () => getSuperAdminUser(id),
  })

  const toggleActive = useMutation({
    mutationFn: (active: boolean) => updateSuperAdminUser(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-user', id] })
      queryClient.invalidateQueries({ queryKey: ['sa-users'] })
    },
  })

  if (isLoading) return <p className="text-muted-foreground text-sm">Carregando...</p>
  if (isError || !user) return <p className="text-destructive text-sm">Usuário não encontrado.</p>

  return (
    <div>
      <DetailHeader backHref="/admin/users" backLabel="Voltar para usuários">
        {!isSelf && (
          <Button
            variant="secondary"
            size="md"
            onClick={() => toggleActive.mutate(!user.active)}
            disabled={toggleActive.isPending}
          >
            {user.active ? 'Desativar' : 'Reativar'}
          </Button>
        )}
        <Button variant="primary" size="md" onClick={() => router.push(`/admin/users/${id}/edit`)}>
          Editar usuário
        </Button>
      </DetailHeader>

      <DetailIdentity name={user.name} subtitle={user.email} id={user.id} avatarUrl={user.avatarUrl} />

      <DetailCard>
        <FieldRow label="Nome" value={user.name} />
        <FieldRow label="E-mail" value={user.email} />
        <FieldRow label="Status" value={
          <StatusBadge label={user.active ? 'Ativo' : 'Inativo'} variant={user.active ? 'success' : 'neutral'} />
        } />
        <FieldRow label="Criado em" value={new Date(user.createdAt).toLocaleDateString('pt-BR')} />
      </DetailCard>
    </div>
  )
}
