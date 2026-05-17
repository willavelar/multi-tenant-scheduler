'use client'

import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'agora'
  if (mins < 60) return `há ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `há ${hrs} h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'ontem'
  if (days < 30)  return `há ${days} dias`
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export default function NotificationsPage() {
  const [page, setPage]      = useState(1)
  const { data, isLoading }  = useNotifications(page)
  const items                = data?.data ?? []
  const total                = data?.total ?? 0
  const limit                = data?.limit ?? 20
  const totalPages           = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="w-full">
      <div className="mb-5">
        <h1 className="text-lg font-bold text-foreground m-0">Notificações</h1>
      </div>

      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex gap-3 items-center">
                <div className="w-2 h-2 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted animate-pulse rounded w-2/5" />
                  <div className="h-3 bg-muted animate-pulse rounded w-3/5" />
                </div>
                <div className="h-3 bg-muted animate-pulse rounded w-16" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-muted-foreground">
            Nenhuma notificação encontrada.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {items.map(n => (
              <div
                key={n.id}
                className={cn(
                  'grid items-center px-4 py-3 grid-cols-[10px_1fr_auto] gap-3',
                  !n.readAt && 'bg-indigo-500/5 dark:bg-indigo-500/10',
                )}
              >
                <div className={cn('w-2 h-2 rounded-full', n.readAt ? 'bg-transparent' : 'bg-indigo-500')} />
                <div className="min-w-0">
                  <p className={cn('text-[13px] font-medium m-0', n.readAt ? 'text-muted-foreground' : 'text-foreground')}>
                    {n.title}
                  </p>
                  <p className="text-[12px] text-muted-foreground m-0 mt-0.5">{n.body}</p>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo(n.createdAt)}</span>
              </div>
            ))}
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-[13px] text-muted-foreground m-0">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => p - 1)}
                disabled={page <= 1}
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages}
              >
                Próxima
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
