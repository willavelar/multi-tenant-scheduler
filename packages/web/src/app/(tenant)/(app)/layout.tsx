import { AppShell } from '@/components/app-shell'
import { UserPreferencesProvider } from '@/providers/UserPreferencesProvider'
import { TenantSettingsProvider } from '@/providers/TenantSettingsProvider'
import { SupportWidget } from '@/components/support-widget'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantSettingsProvider>
      <UserPreferencesProvider>
        <AppShell>{children}</AppShell>
        <SupportWidget />
      </UserPreferencesProvider>
    </TenantSettingsProvider>
  )
}
