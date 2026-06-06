import { Button } from '@/components/ui/button'

type Props = {
  children: React.ReactNode
  onClear?: () => void
  showClear?: boolean
}

export function FilterBar({ children, onClear, showClear }: Props) {
  return (
    <div className="bg-background border border-border rounded-xl px-5 py-4 mb-4 shadow-sm">
      <div className="flex flex-wrap gap-3 items-end">
        {children}
        {showClear && onClear && (
          <div className="flex items-end">
            <Button variant="secondary" size="sm" onClick={onClear}>
              Limpar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
