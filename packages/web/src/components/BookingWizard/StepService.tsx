'use client'

import { useServices } from '@/hooks/useServices'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Service } from '@/types'

type Props = {
  onSelect: (serviceId: string) => void
  onBack: () => void
}

export function StepService({ onSelect, onBack }: Props) {
  const { data: services, isLoading, error } = useServices()

  if (isLoading) return (
    <div className="space-y-3">
      <Skeleton className="h-7 w-40" />
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border border-border rounded-xl">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
  if (error) return <p className="text-red-500">Erro ao carregar serviços.</p>
  if (!services?.length) return <p className="text-muted-foreground">Nenhum serviço disponível.</p>

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Escolha o serviço</h2>
      <div className="grid gap-3">
        {services.filter((s: Service) => s.active).map((svc: Service) => (
          <Card
            key={svc.id}
            role="button"
            tabIndex={0}
            className="p-4 cursor-pointer hover:border-indigo-500 hover:shadow-sm transition-all"
            onClick={() => onSelect(svc.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(svc.id)
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{svc.name}</p>
                {svc.description && <p className="text-sm text-muted-foreground">{svc.description}</p>}
              </div>
              <Badge variant="secondary">{svc.durationMinutes} min</Badge>
            </div>
          </Card>
        ))}
      </div>
      <button onClick={onBack} className="text-sm text-muted-foreground hover:underline">
        ← Voltar
      </button>
    </div>
  )
}
