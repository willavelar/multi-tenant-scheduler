'use client'

import { createContext, useContext, useEffect } from 'react'
import { useTenantSettings } from '@/hooks/useTenantSettings'

type TenantSettingsContextValue = {
  tenantName:                string
  tenantLogoUrl:             string | null
  tenantLogoDarkUrl:         string | null
  confirmationMode:          'auto' | 'manual'
  allowPaidStatus:           boolean
  cancellationReasonMode:    'no' | 'optional' | 'required'
  cancellationDeadlineValue: number | null
  cancellationDeadlineUnit:  'minutes' | 'hours' | 'days' | null
}

const TenantSettingsContext = createContext<TenantSettingsContextValue>({
  tenantName:                '',
  tenantLogoUrl:             null,
  tenantLogoDarkUrl:         null,
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
  const tenantLogoDarkUrl         = data?.logoDarkUrl               ?? null
  const confirmationMode          = data?.confirmationMode          ?? 'auto'
  const allowPaidStatus           = data?.allowPaidStatus           ?? true
  const cancellationReasonMode    = data?.cancellationReasonMode    ?? 'no'
  const cancellationDeadlineValue = data?.cancellationDeadlineValue ?? null
  const cancellationDeadlineUnit  = data?.cancellationDeadlineUnit  ?? null

  useEffect(() => {
    document.title = process.env.NEXT_PUBLIC_APP_NAME ?? 'TimoUp'
  }, [])

  return (
    <TenantSettingsContext.Provider value={{
      tenantName,
      tenantLogoUrl,
      tenantLogoDarkUrl,
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
