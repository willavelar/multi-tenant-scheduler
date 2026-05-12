'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import {Spinner} from "@/components/ui/Spinner";

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors outline-none cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed disabled:pointer-events-none',
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
        {loading ? <Spinner size={14} /> : icon}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
