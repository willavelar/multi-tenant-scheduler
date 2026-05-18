import QueryProvider from '@/providers/QueryProvider'
import { SuperAdminAuthProvider } from '@/providers/SuperAdminAuthProvider'
import { SuperAdminShell } from '@/components/SuperAdminShell'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SuperAdminAuthProvider>
        <SuperAdminShell>{children}</SuperAdminShell>
      </SuperAdminAuthProvider>
    </QueryProvider>
  )
}
