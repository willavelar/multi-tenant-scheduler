import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  /** Bold heading shown at the top of the card. */
  title: string
  /** Optional muted line under the title describing the section. */
  description?: string
  children: ReactNode
  className?: string
}

/**
 * Boxed form section: a titled card grouping a set of fields. Shared by the
 * client, tenant and admin forms so they all share the same box styling.
 */
export function FormCard({ title, description, children, className }: Props) {
  return (
    <div className={cn('bg-card border border-border rounded-xl p-6 mb-5 shadow-sm', className)}>
      <p className={cn('text-sm font-bold text-foreground m-0', description ? 'mb-2' : 'mb-5')}>{title}</p>
      {description && <p className="text-[13px] text-muted-foreground m-0 mb-5">{description}</p>}
      {children}
    </div>
  )
}
