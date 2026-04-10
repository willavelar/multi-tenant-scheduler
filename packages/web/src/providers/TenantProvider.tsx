'use client'

import { createContext, useContext } from 'react'

type TenantContextValue = { slug: string }

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({
  children,
  slug,
}: {
  children: React.ReactNode
  slug: string
}) {
  return <TenantContext.Provider value={{ slug }}>{children}</TenantContext.Provider>
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used inside TenantProvider')
  return ctx
}
