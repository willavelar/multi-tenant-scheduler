'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  icon: React.ReactNode
  label: string
}

export function SidebarNavLink({ href, icon, label }: Props) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.25 rounded-lg text-[13.5px] font-medium mb-0.5 no-underline transition-colors',
        active
          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      {icon}
      {label}
    </Link>
  )
}
