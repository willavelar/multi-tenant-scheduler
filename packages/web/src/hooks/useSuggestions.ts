import { useMutation } from '@tanstack/react-query'
import { useApi } from './useApi'

export interface CreateSuggestionInput {
  content: string
  image?: string | null
}

export function useCreateSuggestion() {
  const api = useApi()
  return useMutation({
    mutationFn: async (input: CreateSuggestionInput) => {
      const res = await api('/suggestions', {
        method: 'POST',
        body: JSON.stringify({
          content: input.content,
          ...(input.image ? { image: input.image } : {}),
        }),
      })
      return res.json()
    },
  })
}
