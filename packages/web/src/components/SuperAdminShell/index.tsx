'use client'

import { SuperAdminSidebar } from './SuperAdminSidebar'
import { SuperAdminHeader } from './SuperAdminHeader'

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <SuperAdminSidebar />
      <div className="ml-65 flex-1 flex flex-col min-h-screen">
        <SuperAdminHeader />
        <main className="flex-1 bg-background p-7">{children}</main>
      </div>
    </div>
  )
}
