'use client'

import { createContext, useContext, useEffect } from 'react'
import { useTenantSettings } from '@/hooks/useTenantSettings'

type TenantSettingsContextValue = {
  tenantName:    string
  tenantLogoUrl: string | null
}

const TenantSettingsContext = createContext<TenantSettingsContextValue>({
  tenantName:    '',
  tenantLogoUrl: null,
})

export function TenantSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data } = useTenantSettings()

  const tenantName    = data?.name    ?? ''
  const tenantLogoUrl = data?.logoUrl ?? null

  useEffect(() => {
    if (!tenantName) return
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Scheduler'
    document.title = `${tenantName} | ${appName}`
  }, [tenantName])

  return (
    <TenantSettingsContext.Provider value={{ tenantName, tenantLogoUrl }}>
      {children}
    </TenantSettingsContext.Provider>
  )
}

export function useTenantSettingsContext() {
  return useContext(TenantSettingsContext)
}
