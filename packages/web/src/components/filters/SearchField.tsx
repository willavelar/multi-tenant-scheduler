type Props = {
  value: string
  onChange: (v: string) => void
  label?: string
  placeholder?: string
}

export function SearchField({ value, onChange, label = 'Busca', placeholder }: Props) {
  return (
    <div className="relative min-w-[240px] [flex:2_1_240px]">
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-1">{label}</label>
      <div className="relative">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-9 w-full pl-[30px] pr-3 text-[13px] text-foreground bg-background border border-border rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
        />
      </div>
    </div>
  )
}
