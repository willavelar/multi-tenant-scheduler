import type { ReactNode } from 'react'
import { BackButton } from '@/components/navigation/BackButton'

type Props = {
  /** When set, renders a back button on the left. */
  backHref?: string
  backLabel?: string
  /** Action buttons rendered on the right (e.g. edit, toggle). */
  children?: ReactNode
}

/**
 * Top row of a detail page: a back button on the left and action buttons on
 * the right. Keeps the two ends spaced apart even when one side is empty.
 */
export function DetailHeader({ backHref, backLabel, children }: Props) {
  return (
    <div className="flex justify-between items-center mb-7">
      {backHref ? <BackButton href={backHref}>{backLabel}</BackButton> : <div />}
      {children ? <div className="flex gap-3">{children}</div> : <div />}
    </div>
  )
}
