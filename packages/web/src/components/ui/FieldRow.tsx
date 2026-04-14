import type { ReactNode } from 'react'

type Props = {
  label: string
  value: ReactNode
}

export function FieldRow({ label, value }: Props) {
  return (
    <div className="flex py-3.5 border-b border-gray-100 last:border-b-0 text-[13.5px]">
      <span className="w-[200px] text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium flex-1">{value}</span>
    </div>
  )
}
