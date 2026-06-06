type Option = { value: string; label: string }

type Props = {
  label: string
  value: string
  onChange: (v: string) => void
  options: Option[]
}

export function SelectField({ label, value, onChange, options }: Props) {
  return (
    <div className="min-w-[160px] [flex:1_1_160px]">
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-9 w-full pl-3 pr-8 text-[13px] text-foreground bg-background border border-border rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>
  )
}
