'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  href: string
  children: ReactNode
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
    <Button
      variant={variant === 'ghost' ? 'ghost' : 'secondary'}
      size="sm"
      icon={chevron}
      onClick={() => router.push(href)}
      className={variant === 'ghost' ? 'mb-5 px-0' : undefined}
    >
      {children}
    </Button>
  )
}
