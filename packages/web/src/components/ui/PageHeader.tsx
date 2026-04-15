'use client'

import { BackButton } from './BackButton'
import { cn } from '@/lib/utils'

type Props = {
  back?: { href: string; label: string }
  action?: { label: string; onClick: () => void; variant?: 'primary' | 'destructive' }
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
        <button
          onClick={action.onClick}
          className={cn(
            'px-4 py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-colors',
            action.variant === 'destructive'
              ? 'bg-red-600 text-white border-0 hover:bg-red-700'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
