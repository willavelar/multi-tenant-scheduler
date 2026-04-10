import { headers } from 'next/headers'
import QueryProvider from '@/providers/QueryProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { TenantProvider } from '@/providers/TenantProvider'

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const slug = headersList.get('x-tenant-slug') ?? 'local'

  return (
    <QueryProvider>
      <AuthProvider>
        <TenantProvider slug={slug}>{children}</TenantProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
