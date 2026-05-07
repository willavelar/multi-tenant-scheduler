'use client'

import { BackButton } from './BackButton'
import { Button } from '@/components/ui/button'
import type { ReactNode } from 'react'

type Props = {
  back?: { href: string; label: string }
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'destructive'
    icon?: ReactNode
  }
}

export function PageHeader({ back, action }: Props) {
  return (
    <div className="flex justify-between items-center mb-7">
      <div>
        {back && (
          <BackButton href={back.href}>{back.label}</BackButton>
        )}
      </div>
      {action && (
        <Button
          variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
          size="md"
          icon={action.icon}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
