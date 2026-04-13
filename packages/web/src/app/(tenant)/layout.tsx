import { headers } from 'next/headers'
import QueryProvider from '@/providers/QueryProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { TenantProvider } from '@/providers/TenantProvider'

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  // Try middleware-forwarded header first, then extract directly from Host
  const forwarded = headersList.get('x-tenant-slug')
  const host = headersList.get('host') ?? ''
  const hostParts = host.split('.')
  const slug = forwarded ?? (hostParts.length >= 2 ? hostParts[0] : 'local')

  return (
    <QueryProvider>
      <TenantProvider slug={slug}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </TenantProvider>
    </QueryProvider>
  )
}
