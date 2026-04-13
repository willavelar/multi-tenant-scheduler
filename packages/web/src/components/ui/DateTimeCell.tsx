type Props = {
  iso: string | null
  fallback?: string
}

export function DateTimeCell({ iso, fallback = '—' }: Props) {
  if (!iso) return <span style={{ color: '#9ca3af' }}>{fallback}</span>

  const d = new Date(iso)
  const day    = String(d.getDate()).padStart(2, '0')
  const month  = String(d.getMonth() + 1).padStart(2, '0')
  const year   = d.getFullYear()
  const hours  = String(d.getHours()).padStart(2, '0')
  const mins   = String(d.getMinutes()).padStart(2, '0')

  return (
    <span style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>
      {`${day}/${month}/${year} às ${hours}:${mins}`}
    </span>
  )
}
