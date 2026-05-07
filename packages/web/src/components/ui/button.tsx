'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors outline-none disabled:opacity-65 disabled:cursor-not-allowed disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:               'bg-indigo-500 text-white hover:bg-indigo-600',
        secondary:             'bg-background text-foreground border border-border hover:bg-accent',
        destructive:           'bg-red-600 text-white hover:bg-red-700',
        'destructive-outline': 'border border-red-200 text-red-500 hover:bg-red-50',
        ghost:                 'text-foreground hover:bg-accent',
      },
      size: {
        lg: 'h-[42px] px-6 text-sm',
        md: 'h-9 px-4 text-[13.5px]',
        sm: 'h-9 px-3.5 text-[13px]',
        xs: 'h-7 px-2.5 text-xs',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

function Spinner() {
  return (
    <svg
      className="animate-spin shrink-0"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    icon?:    React.ReactNode
    loading?: boolean
  }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, icon, loading, disabled, children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? <Spinner /> : icon}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
