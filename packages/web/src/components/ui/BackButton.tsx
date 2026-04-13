'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

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

  if (variant === 'ghost') {
    return (
      <button
        onClick={() => router.push(href)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: '#6b7280', fontWeight: 500,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, marginBottom: 20,
          fontFamily: 'var(--font-inter, Inter, sans-serif)',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
        onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
      >
        {chevron}
        {children}
      </button>
    )
  }

  return (
    <button
      onClick={() => router.push(href)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: '#6b7280', fontWeight: 500,
        background: 'none', border: '1px solid #e5e7eb', borderRadius: 8,
        cursor: 'pointer', padding: '7px 14px',
        fontFamily: 'var(--font-inter, Inter, sans-serif)',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {chevron}
      {children}
    </button>
  )
}
