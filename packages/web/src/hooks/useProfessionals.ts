import { useQuery } from '@tanstack/react-query'
import { useApi } from './useApi'
import type { Professional } from '@/types'

export function useProfessionals() {
  const api = useApi()
  return useQuery<Professional[]>({
    queryKey: ['professionals'],
    queryFn: async () => {
      const res = await api('/professionals')
      return res.json()
    },
  })
}
