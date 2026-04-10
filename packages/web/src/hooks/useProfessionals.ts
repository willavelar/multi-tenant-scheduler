import { useQuery } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { Professional } from '@/types'

export function useProfessionals() {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Professional[]>({
    queryKey: ['professionals', slug],
    queryFn: async () => {
      const res = await api('/professionals')
      return res.json()
    },
  })
}
