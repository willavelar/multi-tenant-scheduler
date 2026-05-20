import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type Props = {
  label: string
  error?: string
  children: ReactNode
  className?: string
}

export function FormField({ label, error, children, className }: Props) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-[13px] font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
