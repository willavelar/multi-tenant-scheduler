'use client'

import { useSuperAdminAuth } from '@/providers/SuperAdminAuthProvider'
import { SidebarNavLink } from '@/components/AppShell/SidebarNavLink'

function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/>
      <path d="M21 2l-9.6 9.6M15.5 7.5l3 3"/>
    </svg>
  )
}

export function SuperAdminSidebar() {
  const { user } = useSuperAdminAuth()

  return (
    <aside className="w-65 min-h-screen bg-sidebar fixed left-0 top-0 bottom-0 flex flex-col z-40 border-r border-sidebar-border">
      <div className="px-5 pt-5 pb-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="white" strokeWidth="2"/>
              <path d="M8 9h8M8 13h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-[15px] font-bold text-sidebar-foreground tracking-[-0.01em]">Admin Panel</span>
        </div>
      </div>

      <nav className="px-3 pt-4 flex-1">
        <p className="text-[10px] font-semibold text-sidebar-foreground/50 tracking-[0.08em] uppercase px-3 mb-2">
          Menu
        </p>
        <SidebarNavLink href="/admin/tenants" icon={<BuildingIcon />} label="Tenants" />

        <p className="text-[10px] font-semibold text-sidebar-foreground/50 tracking-[0.08em] uppercase px-3 mt-5 mb-2">
          Configurações
        </p>
        <SidebarNavLink href="/admin/settings/sso" icon={<KeyIcon />} label="SSO" />
      </nav>

      <div className="p-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/40 text-center">
        {user?.email}
      </div>
    </aside>
  )
}
