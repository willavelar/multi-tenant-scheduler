'use client'

import Link from 'next/link'
import { useSuperAdminAuth } from '@/providers/SuperAdminAuthProvider'
import { SidebarNavLink } from '@/components/app-shell/SidebarNavLink'

function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
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

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-10 5L2 7"/>
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

export function SuperAdminSidebar() {
  const { user } = useSuperAdminAuth()

  return (
    <aside className="w-65 min-h-screen bg-sidebar fixed left-0 top-0 bottom-0 flex flex-col z-40 border-r border-sidebar-border">
      {/* Brand — fixed TimoUp logo (not tenant-customizable) */}
      <div className="border-b border-sidebar-border">
        <Link href="/admin/tenants" className="flex items-center gap-2.5 w-full px-5 pt-5 pb-4">
          <img
            src="/logo-default.png"
            alt="TimoUp"
            className="max-w-full h-auto object-contain p-3"
          />
        </Link>
      </div>

      <nav className="px-3 pt-4 flex-1">
        <p className="text-[10px] font-semibold text-sidebar-foreground/50 tracking-[0.08em] uppercase px-3 mb-2">
          Menu
        </p>
        <SidebarNavLink href="/admin/tenants" icon={<BuildingIcon />} label="Tenants" />
        <SidebarNavLink href="/admin/users" icon={<UsersIcon />} label="Usuários" />
        <SidebarNavLink href="/admin/suggestions" icon={<ChatIcon />} label="Sugestões" />

        <p className="text-[10px] font-semibold text-sidebar-foreground/50 tracking-[0.08em] uppercase px-3 mt-5 mb-2">
          Integrações
        </p>
        <SidebarNavLink href="/admin/settings/sso" icon={<KeyIcon />} label="SSO" />
        <SidebarNavLink href="/admin/settings/whatsapp" icon={<WhatsAppIcon />} label="WhatsApp" />
        <SidebarNavLink href="/admin/settings/email" icon={<MailIcon />} label="E-mail" />
      </nav>

      <div className="p-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/40 text-center">
        {user?.email}
      </div>
    </aside>
  )
}
