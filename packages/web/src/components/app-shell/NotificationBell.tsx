'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMarkAllRead, useNotifications, useUnreadCount } from '@/hooks/useNotifications'
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
  return `há ${days} dias`
}

export function NotificationBell() {
  const [open, setOpen]               = useState(false)
  const [snapshot, setSnapshot]       = useState<typeof notifPage | null>(null)
  const ref                           = useRef<HTMLDivElement>(null)
  const router                        = useRouter()
  const { data: count = 0 }          = useUnreadCount()
  const { data: notifPage }          = useNotifications()
  const { mutate: markAllRead }      = useMarkAllRead()

  const preview = (snapshot ?? notifPage)?.data.slice(0, 5) ?? []

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleOpen() {
    const isOpening = !open
    setOpen(v => !v)
    if (isOpening) {
      if (count > 0) {
        setSnapshot(notifPage)
        markAllRead()
      } else {
        setSnapshot(null)
      }
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-accent border-0 bg-transparent cursor-pointer"
        aria-label="Notificações"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 border-2 border-background">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 w-80 bg-popover border border-border rounded-[10px] shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1.5 duration-150 z-50">
          <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-[12px] font-semibold text-popover-foreground">Notificações</span>
            <button
              onClick={() => { setSnapshot(null); markAllRead() }}
              className="text-[11px] text-indigo-500 hover:text-indigo-400 bg-transparent border-0 cursor-pointer p-0"
            >
              Marcar tudo como lido
            </button>
          </div>

          {preview.length === 0 ? (
            <p className="px-3.5 py-6 text-[12px] text-muted-foreground text-center">Nenhuma notificação</p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {preview.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'px-3.5 py-2.5 border-b border-border last:border-0 flex gap-2.5',
                    !n.readAt && 'bg-indigo-500/5 dark:bg-indigo-500/10',
                  )}
                >
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                    n.readAt ? 'bg-transparent' : 'bg-indigo-500',
                  )} />
                  <div className="min-w-0">
                    <p className={cn(
                      'text-[11.5px] font-medium m-0 truncate',
                      n.readAt ? 'text-muted-foreground' : 'text-foreground',
                    )}>
                      {n.title}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground m-0 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 m-0 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-3.5 py-2 border-t border-border text-center">
            <button
              onClick={() => { setOpen(false); router.push('/notifications') }}
              className="text-[11.5px] text-indigo-500 hover:text-indigo-400 bg-transparent border-0 cursor-pointer p-0"
            >
              Ver todas as notificações →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
