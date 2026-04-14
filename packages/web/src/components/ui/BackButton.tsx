'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  children: ReactNode
  /** 'border' (default) — botão com borda, usado em barras de ação.
   *  'ghost' — texto sutil sem borda, usado acima de formulários. */
  variant?: 'border' | 'ghost'
}

const chevron = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

export function BackButton({ href, children, variant = 'border' }: Props) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(href)}
      className={cn(
        'flex items-center gap-1.5 text-[13px] font-medium text-gray-500 bg-transparent border-0 cursor-pointer transition-colors',
        variant === 'ghost'
          ? 'p-0 mb-5 hover:text-gray-700'
          : 'px-3.5 py-[7px] border border-gray-200 rounded-lg hover:bg-gray-50'
      )}
    >
      {chevron}
      {children}
    </button>
  )
}
