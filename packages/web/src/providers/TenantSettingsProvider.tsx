'use client'

import { createContext, useContext, useEffect } from 'react'
import { useTenantSettings } from '@/hooks/useTenantSettings'

type TenantSettingsContextValue = {
  tenantName:                string
  tenantLogoUrl:             string | null
  confirmationMode:          'auto' | 'manual'
  allowPaidStatus:           boolean
  cancellationReasonMode:    'no' | 'optional' | 'required'
  cancellationDeadlineValue: number | null
  cancellationDeadlineUnit:  'minutes' | 'hours' | 'days' | null
}

const TenantSettingsContext = createContext<TenantSettingsContextValue>({
  tenantName:                '',
  tenantLogoUrl:             null,
  confirmationMode:          'auto',
  allowPaidStatus:           true,
  cancellationReasonMode:    'no',
  cancellationDeadlineValue: null,
  cancellationDeadlineUnit:  null,
})

export function TenantSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data } = useTenantSettings()

  const tenantName                = data?.name                      ?? ''
  const tenantLogoUrl             = data?.logoUrl                   ?? null
  const confirmationMode          = data?.confirmationMode          ?? 'auto'
  const allowPaidStatus           = data?.allowPaidStatus           ?? true
  const cancellationReasonMode    = data?.cancellationReasonMode    ?? 'no'
  const cancellationDeadlineValue = data?.cancellationDeadlineValue ?? null
  const cancellationDeadlineUnit  = data?.cancellationDeadlineUnit  ?? null

  useEffect(() => {
    if (!tenantName) return
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Scheduler'
    document.title = `${tenantName} | ${appName}`
  }, [tenantName])

  return (
    <TenantSettingsContext.Provider value={{
      tenantName,
      tenantLogoUrl,
      confirmationMode,
      allowPaidStatus,
      cancellationReasonMode,
      cancellationDeadlineValue,
      cancellationDeadlineUnit,
    }}>
      {children}
    </TenantSettingsContext.Provider>
  )
}

export function useTenantSettingsContext() {
  return useContext(TenantSettingsContext)
}
