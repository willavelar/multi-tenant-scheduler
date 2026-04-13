const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']

function pickColor(str: string) {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

type Props = {
  name: string
  subtitle?: string
  size?: number
}

export function AvatarName({ name, subtitle, size = 34 }: Props) {
  const fontSize = Math.round(size * 0.35)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: pickColor(name),
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        flexShrink: 0,
        userSelect: 'none',
      }}>
        {initials(name)}
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 12, color: '#111827', lineHeight: 1.3 }}>
          {name}
        </p>
        {subtitle && (
          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#9ca3af', lineHeight: 1.3 }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
