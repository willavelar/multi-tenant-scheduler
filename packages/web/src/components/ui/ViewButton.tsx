import { Button } from '@/components/ui/button'

const eyeIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)

type Props = {
  onClick: () => void
}

export function ViewButton({ onClick }: Props) {
  return (
    <Button variant="secondary" size="xs" icon={eyeIcon} onClick={onClick}>
      Visualizar
    </Button>
  )
}
