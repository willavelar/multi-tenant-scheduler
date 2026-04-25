'use client'

import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import { useTenant } from '@/providers/TenantProvider'
import { useAuth } from '@/providers/AuthProvider'

type Preferences = { timezone: string; timeFormat: '12h' | '24h' }

const DEFAULT: Preferences = { timezone: 'America/Sao_Paulo', timeFormat: '24h' }

const UserPreferencesContext = createContext<Preferences>(DEFAULT)

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const api = useApi()
  const { slug } = useTenant()

  const { data } = useQuery<Preferences>({
    queryKey: ['user-preferences', slug, user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (user!.role === 'professional') return (await api('/professionals/me')).json()
      if (user!.role === 'tenant_admin') return (await api(`/admins/${user!.id}`)).json()
      return (await api(`/clients/${user!.id}`)).json()
    },
  })

  const value: Preferences = {
    timezone:   data?.timezone   ?? DEFAULT.timezone,
    timeFormat: (data?.timeFormat ?? DEFAULT.timeFormat) as '12h' | '24h',
  }

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  )
}

export function useUserPreferences() {
  return useContext(UserPreferencesContext)
}
