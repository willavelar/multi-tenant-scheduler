import type { ReactNode } from 'react'

type Props = {
  label: string
  value: ReactNode
}

export function FieldRow({ label, value }: Props) {
  return (
    <div className="flex py-3.5 border-b border-border last:border-b-0 text-[13.5px]">
      <span className="w-[200px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-medium flex-1">{value}</span>
    </div>
  )
}
