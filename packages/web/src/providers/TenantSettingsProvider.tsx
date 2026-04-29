'use client'

import { createContext, useContext, useEffect } from 'react'
import { useTenantSettings } from '@/hooks/useTenantSettings'

type TenantSettingsContextValue = {
  tenantName:       string
  tenantLogoUrl:    string | null
  confirmationMode: 'auto' | 'manual'
  allowPaidStatus:  boolean
}

const TenantSettingsContext = createContext<TenantSettingsContextValue>({
  tenantName:       '',
  tenantLogoUrl:    null,
  confirmationMode: 'auto',
  allowPaidStatus:  true,
})

export function TenantSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data } = useTenantSettings()

  const tenantName       = data?.name             ?? ''
  const tenantLogoUrl    = data?.logoUrl           ?? null
  const confirmationMode = data?.confirmationMode  ?? 'auto'
  const allowPaidStatus  = data?.allowPaidStatus   ?? true

  useEffect(() => {
    if (!tenantName) return
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Scheduler'
    document.title = `${tenantName} | ${appName}`
  }, [tenantName])

  return (
    <TenantSettingsContext.Provider value={{ tenantName, tenantLogoUrl, confirmationMode, allowPaidStatus }}>
      {children}
    </TenantSettingsContext.Provider>
  )
}

export function useTenantSettingsContext() {
  return useContext(TenantSettingsContext)
}
