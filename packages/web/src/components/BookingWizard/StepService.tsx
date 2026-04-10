'use client'

import { useServices } from '@/hooks/useServices'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Service } from '@/types'

type Props = {
  onSelect: (serviceId: string) => void
  onBack: () => void
}

export function StepService({ onSelect, onBack }: Props) {
  const { data: services, isLoading, error } = useServices()

  if (isLoading) return <p className="text-gray-500">Carregando serviços...</p>
  if (error) return <p className="text-red-500">Erro ao carregar serviços.</p>
  if (!services?.length) return <p className="text-gray-500">Nenhum serviço disponível.</p>

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
                {svc.description && <p className="text-sm text-gray-500">{svc.description}</p>}
              </div>
              <Badge variant="secondary">{svc.durationMinutes} min</Badge>
            </div>
          </Card>
        ))}
      </div>
      <button onClick={onBack} className="text-sm text-gray-500 hover:underline">
        ← Voltar
      </button>
    </div>
  )
}
