export const TIMEZONES = [
  { value: 'America/Sao_Paulo',   label: '(GMT-03:00) Horário Padrão de Brasília - São Paulo' },
  { value: 'America/Manaus',      label: '(GMT-04:00) Horário Padrão do Amazonas - Manaus' },
  { value: 'America/Belem',       label: '(GMT-03:00) Horário de Belém' },
  { value: 'America/Fortaleza',   label: '(GMT-03:00) Horário de Fortaleza' },
  { value: 'America/Recife',      label: '(GMT-03:00) Horário de Recife' },
  { value: 'America/Noronha',     label: '(GMT-02:00) Horário de Fernando de Noronha' },
  { value: 'America/New_York',    label: '(GMT-05:00) Eastern - Nova York' },
  { value: 'America/Chicago',     label: '(GMT-06:00) Central - Chicago' },
  { value: 'America/Los_Angeles', label: '(GMT-08:00) Pacific - Los Angeles' },
  { value: 'Europe/Lisbon',       label: '(GMT+00:00) Lisboa' },
  { value: 'Europe/London',       label: '(GMT+00:00) Londres' },
  { value: 'Europe/Paris',        label: '(GMT+01:00) Paris' },
  { value: 'UTC',                 label: '(GMT+00:00) UTC' },
]

export function formatTime(time: string, format: '12h' | '24h'): string {
  const hhmm = time.slice(0, 5) // HH:mm
  if (format === '24h') return hhmm
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12    = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}
