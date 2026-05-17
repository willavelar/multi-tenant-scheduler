'use client'

import { createContext, useContext } from 'react'
import { SYSTEM_TIMEZONE } from '@/lib/time'

type Preferences = { timezone: string }

const DEFAULT: Preferences = { timezone: SYSTEM_TIMEZONE }

const UserPreferencesContext = createContext<Preferences>(DEFAULT)

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  return (
    <UserPreferencesContext.Provider value={DEFAULT}>
      {children}
    </UserPreferencesContext.Provider>
  )
}

export function useUserPreferences() {
  return useContext(UserPreferencesContext)
}
