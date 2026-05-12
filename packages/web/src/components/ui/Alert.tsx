'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

type AlertVariant = 'warning' | 'success' | 'error' | 'info'

const alertVariants = cva(
  'flex border animate-in fade-in slide-in-from-top-2 duration-300',
  {
    variants: {
      variant: {
        warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500 dark:border-amber-500 dark:text-white',
        success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-500 dark:border-green-500 dark:text-white',
        error:   'bg-red-50 border-red-200 text-red-700 dark:bg-red-500 dark:border-red-500 dark:text-white',
        info:    'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-500 dark:border-blue-500 dark:text-white',
      },
      size: {
        md: 'rounded-xl px-4 py-3 gap-2.5 text-[13px]',
        sm: 'rounded-lg px-3 py-2.5 gap-2 text-[13px]',
      },
    },
    defaultVariants: {
      variant: 'error',
      size: 'md',
    },
  }
)

const ICON_CLASS: Record<AlertVariant, string> = {
  warning: 'text-amber-500 dark:text-white',
  success: 'text-green-500 dark:text-white',
  error:   '',
  info:    'text-blue-500 dark:text-white',
}

const ICONS: Record<AlertVariant, React.ReactNode> = {
  warning: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  success: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
}

type AlertProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    title?: string
  }

function Alert({ variant = 'error', size = 'md', title, children, className, ...props }: AlertProps) {
  const hasTitle = !!title
  const variantSafe = variant as AlertVariant
  return (
    <div
      role="alert"
      className={cn(
        alertVariants({ variant, size }),
        hasTitle ? 'items-start' : 'items-center',
        className,
      )}
      {...props}
    >
      <span className={cn('shrink-0', ICON_CLASS[variantSafe], hasTitle && 'mt-0.5')}>
        {ICONS[variantSafe]}
      </span>
      {hasTitle ? (
        <div>
          <p className="font-semibold leading-snug m-0">{title}</p>
          <p className="mt-0.5 leading-snug m-0 opacity-90">{children}</p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

Alert.displayName = 'Alert'

export { Alert, alertVariants }
