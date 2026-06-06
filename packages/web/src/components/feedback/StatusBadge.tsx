import { cn } from '@/lib/utils'

export type StatusVariant = 'success' | 'error' | 'warning' | 'purple' | 'neutral'

const VARIANT_CLASSES: Record<StatusVariant, { badge: string; dot: string }> = {
  success: { badge: 'bg-green-50 text-green-800 dark:bg-green-500 dark:text-white',     dot: 'bg-green-500 dark:bg-white/80' },
  error:   { badge: 'bg-red-50 text-red-600 dark:bg-red-500 dark:text-white',           dot: 'bg-red-500 dark:bg-white/80' },
  warning: { badge: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-500 dark:text-white',  dot: 'bg-yellow-500 dark:bg-white/80' },
  purple:  { badge: 'bg-violet-50 text-violet-700 dark:bg-violet-500 dark:text-white',  dot: 'bg-violet-500 dark:bg-white/80' },
  neutral: { badge: 'bg-gray-100 text-gray-500 dark:bg-muted dark:text-foreground',     dot: 'bg-gray-400 dark:bg-white/60' },
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
