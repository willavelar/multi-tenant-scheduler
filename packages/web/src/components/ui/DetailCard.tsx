import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
  className?: string
}

export function DetailCard({ children, className }: Props) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-xl px-6 pt-2 pb-6 mb-5 shadow-sm', className)}>
      {children}
    </div>
  )
}
