import { useQuery } from '@tanstack/react-query'
import { useApi } from './useApi'
import type { Service } from '@/types'

export function useServices() {
  const api = useApi()
  return useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api('/services')
      return res.json()
    },
  })
}
