import { pickColor, initials } from '@/lib/avatar'

type Props = {
  name: string
  subtitle?: string
  size?: number
  avatarUrl?: string | null
}

export function AvatarName({ name, subtitle, size = 34, avatarUrl }: Props) {
  const fontSize = Math.round(size * 0.35)

  return (
    <div className="flex items-center gap-2.5">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="rounded-full object-cover shrink-0"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full text-white flex items-center justify-center font-bold shrink-0 select-none"
          style={{ width: size, height: size, background: pickColor(name), fontSize }}
        >
          {initials(name)}
        </div>
      )}
      <div>
        <p className="m-0 font-semibold text-xs text-foreground leading-[1.3]">{name}</p>
        {subtitle && (
          <p className="m-0 mt-px text-xs text-muted-foreground leading-[1.3]">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
