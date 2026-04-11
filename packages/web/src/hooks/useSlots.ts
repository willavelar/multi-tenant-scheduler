import { useQuery } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'

export function useSlots(professionalId: string | null, date: string | null) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<string[]>({
    queryKey: ['slots', slug, professionalId, date],
    staleTime: 0,
    enabled: !!professionalId && !!date,
    queryFn: async () => {
      const res = await api(`/availability/slots?professionalId=${professionalId}&date=${date}`)
      return res.json()
    },
  })
}
