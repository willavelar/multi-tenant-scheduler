'use client'

import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/ui/BackButton'
import { DetailCard } from '@/components/ui/DetailCard'
import { FieldRow } from '@/components/ui/FieldRow'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DateTimeCell } from '@/components/ui/DateTimeCell'
import type { Admin } from '@/types'
import { Button } from '@/components/ui/button'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']
function pickColor(str: string) {
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

type Props = {
  admin:       Admin
  profilePage?: boolean
}

export function AdminDetailView({ admin, profilePage }: Props) {
  const router = useRouter()

  return (
    <div>
      <div className="flex justify-between items-center mb-7">
        {profilePage
          ? <div />
          : <BackButton href="/admins">Voltar para administradores</BackButton>
        }
        <Button variant="primary" size="md" onClick={() => router.push(`/admins/${admin.id}/edit`)}>
          {profilePage ? 'Editar' : 'Editar administrador'}
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-7">
        {admin.avatarUrl ? (
          <img src={admin.avatarUrl} alt={admin.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
        ) : (
          <div
            className="w-14 h-14 rounded-full text-white flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: pickColor(admin.name) }}
          >
            {initials(admin.name)}
          </div>
        )}
        <div>
          <h2 className="m-0 mb-0.5 text-lg font-bold text-foreground">{admin.name}</h2>
          <p className="m-0 mb-1 text-[13px] text-muted-foreground">{admin.email}</p>
          <code className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
            ID: {admin.id}
          </code>
        </div>
      </div>

      <DetailCard>
        <FieldRow label="Nome" value={admin.name} />
        <FieldRow label="E-mail" value={admin.email} />
        <FieldRow label="Status" value={
          <StatusBadge label={admin.active ? 'Ativo' : 'Inativo'} variant={admin.active ? 'success' : 'error'} />
        } />
        <FieldRow label="Cadastrado em" value={<DateTimeCell iso={admin.createdAt} />} />
      </DetailCard>
    </div>
  )
}
