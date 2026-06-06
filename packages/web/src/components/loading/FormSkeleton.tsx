import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  fields?: number
}

export function FormSkeleton({ fields = 6 }: Props) {
  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}
