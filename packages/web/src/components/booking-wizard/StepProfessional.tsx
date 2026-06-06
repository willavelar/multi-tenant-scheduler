'use client'

import { useProfessionals } from '@/hooks/useProfessionals'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Professional } from '@/types'

type Props = {
  onSelect: (professionalId: string) => void
}

function initials(email: string) {
  return email.slice(0, 2).toUpperCase()
}

export function StepProfessional({ onSelect }: Props) {
  const { data: professionals, isLoading, error } = useProfessionals()

  if (isLoading) return (
    <div className="space-y-3">
      <Skeleton className="h-7 w-56" />
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border border-border rounded-xl">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
  if (error) return <p className="text-red-500">Erro ao carregar profissionais.</p>
  if (!professionals?.length) return <p className="text-muted-foreground">Nenhum profissional disponível.</p>

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Escolha um profissional</h2>
      <div className="grid gap-3">
        {professionals.filter((p: Professional) => p.active).map((prof: Professional) => (
          <Card
            key={prof.id}
            role="button"
            tabIndex={0}
            className="p-4 cursor-pointer hover:border-indigo-500 hover:shadow-sm transition-all"
            onClick={() => onSelect(prof.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(prof.id)
              }
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                {initials(prof.userId)}
              </div>
              <div>
                <p className="font-medium">Profissional</p>
                {prof.bio && <p className="text-sm text-muted-foreground">{prof.bio}</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
