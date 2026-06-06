import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  cols: number
  rows?: number
}

export function TableSkeleton({ cols, rows = 8 }: Props) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="border-b border-border">
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-4 py-3 text-left">
              <Skeleton className="h-3 w-16 opacity-60" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, row) => (
          <tr key={row} className="border-b border-border">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-3 w-28" />
              </div>
            </td>
            {Array.from({ length: cols - 1 }).map((_, col) => (
              <td key={col} className="px-4 py-3">
                <Skeleton className="h-3 w-20" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
