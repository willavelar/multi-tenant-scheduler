'use client'

import { BackButton } from './BackButton'

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
          className={
            action.variant === 'destructive'
              ? 'px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 transition-colors'
              : 'px-4 py-2 bg-white text-gray-700 text-[13px] font-semibold rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors'
          }
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
