import type { ReactNode } from 'react'
import { pickColor, initials } from '@/lib/avatar'

type Props = {
  name:       string
  /** Secondary line under the name (e.g. email or slug). */
  subtitle?:  ReactNode
  /** Entity id rendered as a copy-friendly code chip. */
  id?:        string
  avatarUrl?: string | null
}

/**
 * Identity block for a detail page: a large avatar (image or colored initials)
 * next to the entity name, an optional subtitle and an optional id chip.
 */
export function DetailIdentity({ name, subtitle, id, avatarUrl }: Props) {
  return (
    <div className="flex items-center gap-4 mb-7">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-14 h-14 rounded-full object-cover shrink-0" />
      ) : (
        <div
          className="w-14 h-14 rounded-full text-white flex items-center justify-center text-xl font-bold shrink-0"
          style={{ background: pickColor(name) }}
        >
          {initials(name)}
        </div>
      )}
      <div>
        <h2 className="m-0 mb-0.5 text-lg font-bold text-foreground">{name}</h2>
        {subtitle && <p className="m-0 mb-1 text-[13px] text-muted-foreground">{subtitle}</p>}
        {id && (
          <code className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
            ID: {id}
          </code>
        )}
      </div>
    </div>
  )
}
