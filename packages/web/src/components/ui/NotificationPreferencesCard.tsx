'use client'

import { cn } from '@/lib/utils'

type NotifPrefs = {
  notifyViaSystem:   boolean
  notifyViaEmail:    boolean
  notifyViaWhatsapp: boolean
}

type Props = NotifPrefs & {
  email:    string
  phone:    string | null
  onChange: (prefs: NotifPrefs) => void
}

function CheckboxCard({
  checked, disabled, label, hint, onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  hint?: string
  onChange: (v: boolean) => void
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
        disabled
          ? 'opacity-50 cursor-not-allowed border-border bg-muted/30'
          : checked
          ? 'border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-500/10 cursor-pointer'
          : 'border-border bg-background hover:bg-accent cursor-pointer',
      )}
      onClick={() => !disabled && onChange(!checked)}
    >
      <div className={cn(
        'w-4 h-4 rounded-[4px] border flex items-center justify-center mt-0.5 shrink-0 transition-colors',
        disabled
          ? 'border-border bg-muted'
          : checked
          ? 'bg-indigo-500 border-indigo-500'
          : 'border-border bg-background',
      )}>
        {checked && !disabled && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>
      <div>
        <p className={cn('text-[13px] font-medium m-0', disabled ? 'text-muted-foreground' : 'text-foreground')}>
          {label}
        </p>
        {hint && <p className="text-[11.5px] text-muted-foreground m-0 mt-0.5">{hint}</p>}
      </div>
    </div>
  )
}

export function NotificationPreferencesCard({ notifyViaSystem, notifyViaEmail, notifyViaWhatsapp, email, phone, onChange }: Props) {
  const noneSelected = !notifyViaSystem && !notifyViaEmail && !notifyViaWhatsapp

  function toggle(channel: 'system' | 'email' | 'whatsapp') {
    onChange({
      notifyViaSystem:   channel === 'system'   ? !notifyViaSystem   : notifyViaSystem,
      notifyViaEmail:    channel === 'email'    ? !notifyViaEmail    : notifyViaEmail,
      notifyViaWhatsapp: channel === 'whatsapp' ? !notifyViaWhatsapp : notifyViaWhatsapp,
    })
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-5 shadow-sm">
      <p className="text-sm font-bold text-foreground m-0 mb-1">Notificações</p>
      <p className="text-xs text-muted-foreground m-0 mb-4">Escolha como deseja ser notificado sobre agendamentos</p>
      <div className="flex flex-col gap-2">
        <CheckboxCard
          checked={notifyViaSystem}
          label="Via Sistema"
          hint="Notificações no aplicativo"
          onChange={() => toggle('system')}
        />
        <CheckboxCard
          checked={notifyViaEmail}
          label="Via E-mail"
          hint={email}
          onChange={() => toggle('email')}
        />
        <CheckboxCard
          checked={notifyViaWhatsapp}
          disabled={!phone}
          label="Via WhatsApp"
          hint={phone ?? 'Adicione um telefone para habilitar'}
          onChange={() => toggle('whatsapp')}
        />
        <div
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors mt-1',
            noneSelected
              ? 'border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-500/10'
              : 'border-border bg-background hover:bg-accent',
          )}
          onClick={() => onChange({ notifyViaSystem: false, notifyViaEmail: false, notifyViaWhatsapp: false })}
        >
          <div className={cn(
            'w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0',
            noneSelected ? 'bg-indigo-500 border-indigo-500' : 'border-border',
          )}>
            {noneSelected && (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground m-0">Não receber notificações</p>
        </div>
      </div>
    </div>
  )
}
