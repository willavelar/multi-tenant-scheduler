import { useQuery } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'

export function useLimitCheck(
  serviceId: string | null,
  date: string | null,
  clientId?: string | null,
) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<{ exceeded: boolean }>({
    queryKey: ['limit-check', slug, serviceId, date, clientId ?? null],
    enabled: !!serviceId && !!date,
    staleTime: 0,
    queryFn: async () => {
      const params = new URLSearchParams({ serviceId: serviceId!, date: date! })
      if (clientId) params.set('clientId', clientId)
      const res = await api(`/appointments/limit-check?${params}`)
      return res.json()
    },
  })
}
