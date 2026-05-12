'use client'

import { useState, useEffect } from 'react'
import { LogoCropField } from '@/components/ui/LogoCropField'
import { useTenantSettings, useUpdateTenantSettings } from '@/hooks/useTenantSettings'
import { cn } from '@/lib/utils'
import { FormSkeleton } from '@/components/ui/FormSkeleton'
import { Button } from '@/components/ui/button'
import {Spinner} from "@/components/ui/Spinner";

type CancelReasonMode = 'no' | 'optional' | 'required'
type DeadlineUnit = 'minutes' | 'hours' | 'days'

const CANCEL_REASON_OPTIONS: { value: CancelReasonMode; label: string }[] = [
  { value: 'no',       label: 'Não' },
  { value: 'optional', label: 'Sim' },
  { value: 'required', label: 'Obrigatório' },
]

const DEADLINE_UNIT_OPTIONS: { value: DeadlineUnit; label: string }[] = [
  { value: 'minutes', label: 'Min' },
  { value: 'hours',   label: 'Horas' },
  { value: 'days',    label: 'Dias' },
]

const inputCls = (disabled = false) => cn(
  'w-full h-[42px] px-3 text-sm text-foreground bg-background rounded-lg border border-border outline-none transition-colors',
  disabled
    ? 'opacity-60 cursor-not-allowed bg-muted'
    : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
)

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
        checked ? 'bg-indigo-500' : 'bg-muted',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

export function TenantGeneralForm() {
  const { data, isLoading } = useTenantSettings()
  const { mutateAsync, isPending } = useUpdateTenantSettings()

  const [name,     setName]     = useState('')
  const [logoUrl,  setLogoUrl]  = useState<string | null>(null)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  const [allowPaidStatus,  setAllowPaidStatus]  = useState(true)
  const [requiresConfirm,  setRequiresConfirm]  = useState(false)
  const [cancelReasonMode, setCancelReasonMode] = useState<CancelReasonMode>('no')
  const [deadlineValue,    setDeadlineValue]    = useState('')
  const [deadlineUnit,     setDeadlineUnit]     = useState<DeadlineUnit>('hours')
  const [toggleSaving,     setToggleSaving]     = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setName(data.name)
    setLogoUrl(data.logoUrl)
    setAllowPaidStatus(data.allowPaidStatus)
    setRequiresConfirm(data.confirmationMode === 'manual')
    setCancelReasonMode(data.cancellationReasonMode)
    setDeadlineValue(data.cancellationDeadlineValue != null ? String(data.cancellationDeadlineValue) : '')
    setDeadlineUnit(data.cancellationDeadlineUnit ?? 'hours')
  }, [data])

  if (isLoading) return <FormSkeleton fields={5} />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || name.trim().length < 2) {
      setError('Nome deve ter pelo menos 2 caracteres.')
      return
    }
    setError('')
    setSuccess(false)
    try {
      await mutateAsync({ name: name.trim(), logoUrl })
      setSuccess(true)
    } catch {
      setError('Não foi possível salvar as alterações. Tente novamente.')
    }
  }

  async function handleTogglePaidStatus(value: boolean) {
    setAllowPaidStatus(value)
    setToggleSaving('paid')
    try {
      await mutateAsync({ allowPaidStatus: value })
    } catch {
      setAllowPaidStatus(!value)
    } finally {
      setToggleSaving(null)
    }
  }

  async function handleToggleConfirmation(value: boolean) {
    setRequiresConfirm(value)
    setToggleSaving('confirm')
    try {
      await mutateAsync({ confirmationMode: value ? 'manual' : 'auto' })
    } catch {
      setRequiresConfirm(!value)
    } finally {
      setToggleSaving(null)
    }
  }

  async function handleCancelReasonModeChange(value: CancelReasonMode) {
    const prev = cancelReasonMode
    setCancelReasonMode(value)
    setToggleSaving('cancelReason')
    try {
      await mutateAsync({ cancellationReasonMode: value })
    } catch {
      setCancelReasonMode(prev)
    } finally {
      setToggleSaving(null)
    }
  }

  async function handleDeadlineSave(value: string, unit: DeadlineUnit) {
    const parsed = parseInt(value, 10)
    const isValid = value !== '' && !isNaN(parsed) && parsed >= 1 && parsed <= 9999
    setToggleSaving('deadline')
    try {
      if (!isValid) {
        await mutateAsync({ cancellationDeadlineValue: null, cancellationDeadlineUnit: null })
        setDeadlineValue('')
      } else {
        await mutateAsync({ cancellationDeadlineValue: parsed, cancellationDeadlineUnit: unit })
      }
    } catch {
      // revert to last saved values on error
      setDeadlineValue(data?.cancellationDeadlineValue != null ? String(data.cancellationDeadlineValue) : '')
      setDeadlineUnit(data?.cancellationDeadlineUnit ?? 'hours')
    } finally {
      setToggleSaving(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── Logo ── */}
      <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-foreground m-0 mb-5">Logo</p>
        <p className="text-[13px] text-muted-foreground m-0 mb-4">
          Aparece no topo do menu lateral. Proporção 6:1 (horizontal).
        </p>
        <LogoCropField value={logoUrl} onChange={(v) => { setLogoUrl(v); setSuccess(false) }} />
        {logoUrl && (
          <button
            type="button"
            onClick={() => setLogoUrl(null)}
            className="mt-3 text-xs text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer p-0 transition-colors"
          >
            Remover logo
          </button>
        )}
      </div>

      {/* ── Dados ── */}
      <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-foreground m-0 mb-5">Informações</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tenant-name" className="block text-[13px] font-medium text-foreground mb-1.5">
              Nome <span className="text-red-400">*</span>
            </label>
            <input
              id="tenant-name"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); setSuccess(false) }}
              className={inputCls()}
            />
          </div>
          <div>
            <label htmlFor="tenant-slug" className="block text-[13px] font-medium text-foreground mb-1.5">
              Host (slug)
            </label>
            <input
              id="tenant-slug"
              type="text"
              value={data?.slug ?? ''}
              disabled
              className={inputCls(true)}
            />
            <p className="text-[11px] text-muted-foreground mt-1 m-0">O host não pode ser alterado.</p>
          </div>
        </div>
      </div>

      {/* ── Comportamento ── */}
      <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-foreground m-0 mb-5">Comportamento</p>

        <div className="space-y-5">

          {/* Toggle: Paid status */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-foreground m-0 mb-0.5">Habilitar status "Pago"</p>
              <p className="text-[12px] text-muted-foreground m-0">
                Permite marcar agendamentos como pagos. Quando desativado, a opção é removida do sistema.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {toggleSaving === 'paid' && <Spinner size={14} />}
              <Toggle checked={allowPaidStatus} onChange={handleTogglePaidStatus} disabled={toggleSaving === 'paid'} />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Toggle: Confirmation required */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-foreground m-0 mb-0.5">Exigir confirmação de agendamentos</p>
              <p className="text-[12px] text-muted-foreground m-0">
                Novos agendamentos criados por clientes ficam como "Aguardando confirmação" até serem confirmados.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {toggleSaving === 'confirm' && <Spinner size={14} />}
              <Toggle checked={requiresConfirm} onChange={handleToggleConfirmation} disabled={toggleSaving === 'confirm'} />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Segmented control: Cancellation reason mode */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-foreground m-0 mb-0.5">Motivo de cancelamento</p>
              <p className="text-[12px] text-muted-foreground m-0">
                Define se o usuário precisa informar um motivo ao cancelar um agendamento.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {toggleSaving === 'cancelReason' && <Spinner size={14} />}
              <div className="flex border border-border rounded-lg overflow-hidden">
                {CANCEL_REASON_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={toggleSaving === 'cancelReason'}
                    onClick={() => handleCancelReasonModeChange(opt.value)}
                    className={cn(
                      'px-3 py-1.5 text-[12px] font-medium border-0 cursor-pointer transition-colors',
                      cancelReasonMode === opt.value
                        ? 'bg-indigo-500 text-white'
                        : 'bg-background text-muted-foreground hover:bg-accent',
                      i < CANCEL_REASON_OPTIONS.length - 1 && 'border-r border-border',
                      toggleSaving === 'cancelReason' && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Deadline: Cancellation deadline */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-foreground m-0 mb-0.5">Prazo máximo de cancelamento</p>
              <p className="text-[12px] text-muted-foreground m-0">
                Define até quando o cliente pode cancelar um agendamento antes do atendimento. Deixe em branco para não limitar.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {toggleSaving === 'deadline' && <Spinner size={14} />}
              <input
                type="number"
                min={1}
                max={9999}
                step={1}
                value={deadlineValue}
                onChange={e => setDeadlineValue(e.target.value)}
                onBlur={() => handleDeadlineSave(deadlineValue, deadlineUnit)}
                placeholder="—"
                disabled={toggleSaving === 'deadline'}
                className={cn(
                  'w-16 h-[34px] px-2 text-sm text-center text-foreground bg-background rounded-lg border border-border outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                  toggleSaving === 'deadline'
                    ? 'opacity-50 cursor-not-allowed bg-muted'
                    : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
                )}
              />
              <div className="flex border border-border rounded-lg overflow-hidden">
                {DEADLINE_UNIT_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={toggleSaving === 'deadline'}
                    onMouseDown={(e: React.MouseEvent) => {
                      e.preventDefault() // prevents onBlur on the number input
                      setDeadlineUnit(opt.value)
                      if (deadlineValue !== '') handleDeadlineSave(deadlineValue, opt.value)
                    }}
                    className={cn(
                      'px-3 py-1.5 text-[12px] font-medium border-0 cursor-pointer transition-colors',
                      deadlineUnit === opt.value
                        ? 'bg-indigo-500 text-white'
                        : 'bg-background text-muted-foreground hover:bg-accent',
                      i < DEADLINE_UNIT_OPTIONS.length - 1 && 'border-r border-border',
                      toggleSaving === 'deadline' && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      {error && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 dark:bg-red-500 dark:border-red-500 dark:text-white">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[13px] text-emerald-700">
          Alterações salvas com sucesso.
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isPending}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
        >
          Salvar alterações
        </Button>
      </div>

    </form>
  )
}
