import { useMutation } from '@tanstack/react-query'
import { useApi } from './useApi'

export function useResendInvite() {
  const api = useApi()
  return useMutation({
    mutationFn: (userId: string) =>
      api('/auth/resend-invite', { method: 'POST', body: JSON.stringify({ userId }) }),
  })
}
