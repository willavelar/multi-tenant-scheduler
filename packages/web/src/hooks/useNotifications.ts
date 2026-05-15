import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { NotificationPage } from '@/types'

export function useUnreadCount() {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery({
    queryKey:        ['notifications-unread-count', slug],
    queryFn:         async () => {
      const res = await api('/notifications/unread-count')
      return res.json() as Promise<{ count: number }>
    },
    select:          (res) => res.count,
    refetchInterval: 30_000,
    staleTime:       25_000,
  })
}

export function useNotifications(unreadOnly = false) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery({
    queryKey: ['notifications', slug, unreadOnly],
    queryFn:  async () => {
      const res = await api(
        `/notifications?limit=50${unreadOnly ? '&unreadOnly=true' : ''}`,
      )
      return res.json() as Promise<NotificationPage>
    },
  })
}

export function useMarkAllRead() {
  const api = useApi()
  const { slug } = useTenant()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api('/notifications/mark-all-read', { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', slug] })
      queryClient.invalidateQueries({ queryKey: ['notifications', slug] })
    },
  })
}
