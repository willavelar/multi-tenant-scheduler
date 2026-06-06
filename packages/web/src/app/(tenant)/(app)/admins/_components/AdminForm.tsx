'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { AvatarCropField } from '@/components/fields/AvatarCropField'
import { NotificationPreferencesCard } from '@/components/sections/NotificationPreferencesCard'
import { LinkedAccountsCard } from '@/components/sections/LinkedAccountsCard'
import { cn } from '@/lib/utils'
import { inputCls } from '@/components/fields/inputStyles'
import { Button } from '@/components/ui/button'
import { useResendInvite } from '@/hooks/useResendInvite'

// ── Schemas ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name:       z.string().min(2, 'Nome obrigatório'),
  email:      z.string().email('E-mail inválido'),
  sendInvite: z.boolean().optional(),
  password:   z.string().optional(),
  avatarUrl:  z.string().nullable().optional(),
}).refine(
  (d) => d.sendInvite || (!!d.password && d.password.length >= 6),
  { message: 'Mínimo 6 caracteres', path: ['password'] },
)

const editSchema = z.object({
  name:              z.string().min(2, 'Nome obrigatório'),
  avatarUrl:         z.string().nullable().optional(),
  active:            z.boolean().optional(),
  notifyViaSystem:   z.boolean().optional(),
  notifyViaEmail:    z.boolean().optional(),
  notifyViaWhatsapp: z.boolean().optional(),
})

// ── Types ─────────────────────────────────────────────────────────────────────

type FormValues = {
  name:               string
  email?:             string
  password?:          string
  sendInvite?:        boolean
  avatarUrl?:         string | null
  active?:            boolean
  notifyViaSystem?:   boolean
  notifyViaEmail?:    boolean
  notifyViaWhatsapp?: boolean
}

export type AdminFormData = FormValues

export type AdminFormProps = {
  mode:           'create' | 'edit'
  defaultValues?: Partial<FormValues>
  userId?:        string
  onSubmit:       (data: AdminFormData) => Promise<void>
  onCancel?:      () => void
  isOwnProfile?:  boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminForm({ mode, defaultValues, userId, onSubmit, onCancel, isOwnProfile }: AdminFormProps) {
  const resolver = (mode === 'create'
    ? zodResolver(createSchema)
    : zodResolver(editSchema)) as Resolver<FormValues>

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver,
    defaultValues: {
      name:      defaultValues?.name      ?? '',
      avatarUrl: defaultValues?.avatarUrl ?? null,
      ...(mode === 'create' ? { email: '', password: '', sendInvite: true } : {}),
      ...(mode === 'edit' ? {
        active:            defaultValues?.active            ?? true,
        notifyViaSystem:   defaultValues?.notifyViaSystem   ?? true,
        notifyViaEmail:    defaultValues?.notifyViaEmail    ?? false,
        notifyViaWhatsapp: defaultValues?.notifyViaWhatsapp ?? false,
      } : {}),
    },
  })

  const resendInvite = useResendInvite()
  const [inviteSent, setInviteSent] = useState(false)

  const nameValue            = watch('name') ?? ''
  const avatarValue          = watch('avatarUrl') ?? null
  const activeValue          = watch('active') ?? true
  const sendInviteValue      = watch('sendInvite') ?? true
  const notifyViaSystemValue   = watch('notifyViaSystem')   ?? true
  const notifyViaEmailValue    = watch('notifyViaEmail')    ?? false
  const notifyViaWhatsappValue = watch('notifyViaWhatsapp') ?? false

  async function submit(data: FormValues) {
    try {
      await onSubmit(data)
    } catch {
      setError('root', {
        message: mode === 'create'
          ? 'Não foi possível cadastrar. Verifique os dados e tente novamente.'
          : 'Não foi possível salvar as alterações. Verifique os dados e tente novamente.',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>

      {/* ── Card: Dados pessoais ── */}
      <div className="bg-card border border-border rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-foreground m-0 mb-5">Dados pessoais</p>

        <div className="mb-5">
          <AvatarCropField
            value={avatarValue}
            onChange={(v) => setValue('avatarUrl', v)}
            name={nameValue}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="admin-name" className="block text-[13px] font-medium text-foreground mb-1.5">
            Nome completo <span className="text-red-500">*</span>
          </label>
          <input id="admin-name" type="text" {...register('name')} className={inputCls(!!errors.name)} />
          {errors.name && <p className="mt-1 text-xs text-red-500 m-0">{errors.name.message}</p>}
        </div>

        {mode === 'create' && (
          <>
            <div className="mb-4">
              <label htmlFor="admin-email" className="block text-[13px] font-medium text-foreground mb-1.5">
                E-mail <span className="text-red-500">*</span>
              </label>
              <input id="admin-email" type="email" {...register('email')} className={inputCls(!!errors.email)} />
              {errors.email && <p className="mt-1 text-xs text-red-500 m-0">{errors.email.message}</p>}
            </div>

            <div className="mb-4 flex items-center gap-2.5">
              <input
                id="admin-send-invite"
                type="checkbox"
                {...register('sendInvite')}
                className="w-4 h-4 rounded border-border text-indigo-500 cursor-pointer accent-indigo-500"
              />
              <label htmlFor="admin-send-invite" className="text-[13px] font-medium text-foreground cursor-pointer select-none">
                Enviar convite por e-mail para o usuário cadastrar a senha
              </label>
            </div>

            {!sendInviteValue && (
              <div>
                <label htmlFor="admin-password" className="block text-[13px] font-medium text-foreground mb-1.5">
                  Senha inicial <span className="text-red-500">*</span>
                </label>
                <input id="admin-password" type="password" {...register('password')} className={inputCls(!!errors.password)} />
                {errors.password && <p className="mt-1 text-xs text-red-500 m-0">{errors.password.message}</p>}
              </div>
            )}
          </>
        )}

        {mode === 'edit' && !isOwnProfile && (
          <div className="max-w-[220px]">
            <label htmlFor="admin-active" className="block text-[13px] font-medium text-foreground mb-1.5">Status</label>
            <div className="relative">
              <select
                id="admin-active"
                value={activeValue ? 'true' : 'false'}
                onChange={(e) => setValue('active', e.target.value === 'true')}
                className={cn(inputCls(), 'appearance-none cursor-pointer')}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
              <svg
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        )}

        {mode === 'edit' && !isOwnProfile && !activeValue && userId && (
          <div className="mt-4">
            {inviteSent ? (
              <p className="text-[13px] text-emerald-600 font-medium flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                E-mail enviado
              </p>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={resendInvite.isPending}
                onClick={async () => {
                  await resendInvite.mutateAsync(userId)
                  setInviteSent(true)
                }}
              >
                Reenviar convite de senha
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Card: Notificações ── */}
      {mode === 'edit' && (
        <NotificationPreferencesCard
          notifyViaSystem={notifyViaSystemValue}
          notifyViaEmail={notifyViaEmailValue}
          notifyViaWhatsapp={notifyViaWhatsappValue}
          email={defaultValues?.email ?? ''}
          phone={null}
          onChange={(prefs) => {
            setValue('notifyViaSystem',   prefs.notifyViaSystem)
            setValue('notifyViaEmail',    prefs.notifyViaEmail)
            setValue('notifyViaWhatsapp', prefs.notifyViaWhatsapp)
          }}
        />
      )}

      {/* ── Card: Contas vinculadas ── */}
      {mode === 'edit' && isOwnProfile && <LinkedAccountsCard />}

      {/* ── Footer ── */}
      {errors.root && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 dark:bg-red-500 dark:border-red-500 dark:text-white">
          {errors.root.message}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
        >
          {mode === 'create' ? 'Cadastrar administrador' : 'Salvar alterações'}
        </Button>

        {mode === 'edit' && onCancel && (
          <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>

    </form>
  )
}
