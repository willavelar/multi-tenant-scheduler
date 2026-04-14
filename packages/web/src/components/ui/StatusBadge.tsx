import { cn } from '@/lib/utils'

export type StatusVariant = 'success' | 'error' | 'warning' | 'purple' | 'neutral'

const VARIANT_CLASSES: Record<StatusVariant, { badge: string; dot: string }> = {
  success: { badge: 'bg-green-50 text-green-800',   dot: 'bg-green-500' },
  error:   { badge: 'bg-red-50 text-red-600',       dot: 'bg-red-500' },
  warning: { badge: 'bg-yellow-50 text-yellow-800', dot: 'bg-yellow-500' },
  purple:  { badge: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
  neutral: { badge: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
}

type Props = {
  label: string
  variant: StatusVariant
}

export function StatusBadge({ label, variant }: Props) {
  const { badge, dot } = VARIANT_CLASSES[variant]
  return (
    <span className={cn(
      'inline-flex items-center gap-[5px] px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap',
      badge
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
      {label}
    </span>
  )
}
