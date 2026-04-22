import { AppShell } from '@/components/AppShell'
import { UserPreferencesProvider } from '@/providers/UserPreferencesProvider'
import { TenantSettingsProvider } from '@/providers/TenantSettingsProvider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantSettingsProvider>
      <UserPreferencesProvider>
        <AppShell>{children}</AppShell>
      </UserPreferencesProvider>
    </TenantSettingsProvider>
  )
}
