import { useQuery } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { Service } from '@/types'

export function useServices() {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Service[]>({
    queryKey: ['services', slug],
    queryFn: async () => {
      const res = await api('/services')
      return res.json()
    },
  })
}
