import { cn } from '@/lib/utils'

/**
 * Shared class for text inputs, selects and textareas across all forms.
 * Single source of truth — previously copy-pasted in every form file.
 * Pass `true` to render the error border.
 */
export const inputCls = (hasError = false) => cn(
  'w-full h-[42px] px-3 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
  hasError ? 'border-destructive' : 'border-border',
)
