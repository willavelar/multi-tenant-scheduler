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
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-full text-white flex items-center justify-center font-bold shrink-0 select-none"
        style={{ width: size, height: size, background: pickColor(name), fontSize }}
      >
        {initials(name)}
      </div>
      <div>
        <p className="m-0 font-semibold text-xs text-gray-900 leading-[1.3]">{name}</p>
        {subtitle && (
          <p className="m-0 mt-px text-xs text-gray-400 leading-[1.3]">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
