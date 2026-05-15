'use client'

import { useEffect, useState } from 'react'
import { useMarkAllRead, useNotifications } from '@/hooks/useNotifications'
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
  const [unreadOnly, setUnreadOnly]  = useState(false)
  const { data, isLoading }          = useNotifications(unreadOnly)
  const { mutate: markAllRead }      = useMarkAllRead()
  const items                        = data?.data ?? []

  useEffect(() => { markAllRead() }, [])

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground m-0">Notificações</h1>
          <p className="text-xs text-muted-foreground m-0 mt-0.5">Últimos 30 dias</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted border border-border rounded-lg overflow-hidden text-[12px]">
            <button
              onClick={() => setUnreadOnly(false)}
              className={cn(
                'px-3 py-1.5 border-0 cursor-pointer transition-colors',
                !unreadOnly ? 'bg-indigo-500 text-white' : 'bg-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setUnreadOnly(true)}
              className={cn(
                'px-3 py-1.5 border-0 cursor-pointer transition-colors',
                unreadOnly ? 'bg-indigo-500 text-white' : 'bg-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              Não lidas
            </button>
          </div>
          <button
            onClick={() => markAllRead()}
            className="text-[12px] text-indigo-500 hover:text-indigo-400 bg-transparent border border-indigo-500/30 rounded-lg px-3 py-1.5 cursor-pointer"
          >
            Marcar lidas
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          Nenhuma notificação encontrada.
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {items.map(n => (
            <div
              key={n.id}
              className={cn(
                'grid items-center px-4 py-3 border-b border-border last:border-0',
                'grid-cols-[10px_1fr_auto] gap-3',
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
    </div>
  )
}
