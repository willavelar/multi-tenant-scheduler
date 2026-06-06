import { Skeleton } from '@/components/ui/skeleton'
import { DetailCard } from '@/components/sections/DetailCard'

type Props = {
  fields?: number
}

export function DetailSkeleton({ fields = 8 }: Props) {
  return (
    <div>
      <div className="flex justify-between items-center mb-7">
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex items-center gap-4 mb-7">
        <Skeleton className="w-14 h-14 rounded-full shrink-0" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-52" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <DetailCard>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex py-3.5 border-b border-border last:border-b-0">
            <Skeleton className="h-3 w-[130px] shrink-0" />
            <Skeleton className="h-3 w-48 ml-8" />
          </div>
        ))}
      </DetailCard>
    </div>
  )
}
