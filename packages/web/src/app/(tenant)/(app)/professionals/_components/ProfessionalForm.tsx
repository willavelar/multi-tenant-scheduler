'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { AvatarCropField } from '@/components/fields/AvatarCropField'
import { NotificationPreferencesCard } from '@/components/sections/NotificationPreferencesCard'
import { LinkedAccountsCard } from '@/components/sections/LinkedAccountsCard'
import { ScheduleCard, type LocalSlot } from './ScheduleCard'
import { ExceptionsCard, type LocalException } from './ExceptionsCard'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useResendInvite } from '@/hooks/useResendInvite'

// ── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name:       z.string().min(2, 'Nome obrigatório'),
  email:      z.string().email('E-mail inválido'),
  sendInvite: z.boolean().optional(),
  password:   z.string().optional(),
  position:   z.string().optional(),
  bio:        z.string().optional(),
  avatarUrl:  z.string().nullable().optional(),
}).refine(
  (d) => d.sendInvite || (!!d.password && d.password.length >= 6),
  { message: 'Mínimo 6 caracteres', path: ['password'] },
)

const editSchema = z.object({
  name:              z.string().min(2, 'Nome obrigatório'),
  position:          z.string().optional(),
  bio:               z.string().optional(),
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
  position?:          string
  bio?:               string
  avatarUrl?:         string | null
  active?:            boolean
  notifyViaSystem?:   boolean
  notifyViaEmail?:    boolean
  notifyViaWhatsapp?: boolean
}

export type ProfessionalFormData = FormValues & {
  schedule?:   LocalSlot[]
  exceptions?: LocalException[]
}

export type ProfessionalFormProps = {
  mode:             'create' | 'edit'
  defaultValues?:   Partial<FormValues>
  professionalId?:  string
  userId?:          string
  onSubmit:         (data: ProfessionalFormData) => Promise<void>
  onCancel?:        () => void
  isAdmin?:         boolean
  isOwnProfile?:    boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = (hasError = false) => cn(
  'w-full h-[42px] px-3 text-sm text-foreground bg-background rounded-lg border outline-none transition-colors',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
  hasError ? 'border-red-400' : 'border-border',
)

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfessionalForm({
  mode,
  defaultValues,
  professionalId,
  userId,
  onSubmit,
  onCancel,
  isAdmin,
  isOwnProfile,
}: ProfessionalFormProps) {
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
      position:  defaultValues?.position  ?? '',
      bio:       defaultValues?.bio       ?? '',
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

  // Schedule/exceptions local state — only used in create mode
  const [schedule, setSchedule]     = useState<LocalSlot[]>([])
  const [exceptions, setExceptions] = useState<LocalException[]>([])

  const nameValue            = watch('name') ?? ''
  const avatarValue          = watch('avatarUrl') ?? null
  const activeValue          = watch('active') ?? true
  const sendInviteValue      = watch('sendInvite') ?? true
  const notifyViaSystemValue   = watch('notifyViaSystem')   ?? true
  const notifyViaEmailValue    = watch('notifyViaEmail')    ?? false
  const notifyViaWhatsappValue = watch('notifyViaWhatsapp') ?? false
  const showStatus    = mode === 'edit' && isAdmin && !isOwnProfile
  const showSchedule  = mode === 'edit' ? !!professionalId && (!!isOwnProfile || !!isAdmin) : true

  async function submit(data: FormValues) {
    try {
      await onSubmit({
        ...data,
        ...(mode === 'create' ? { schedule, exceptions } : {}),
      })
    } catch {
      setError('root', { message: mode === 'create'
        ? 'Não foi possível cadastrar. Verifique os dados e tente novamente.'
        : 'Não foi possível salvar as alterações. Verifique os dados e tente novamente.',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>

      {/* ── Card 1: Dados pessoais ── */}
      <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-foreground m-0 mb-5">Dados pessoais</p>

        <div className="mb-5">
          <AvatarCropField
            value={avatarValue}
            onChange={(v) => setValue('avatarUrl', v)}
            name={nameValue}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="prof-name" className="block text-[13px] font-medium text-foreground mb-1.5">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input id="prof-name" type="text" {...register('name')} className={inputCls(!!errors.name)} />
            {errors.name && <p className="mt-1 text-xs text-red-500 m-0">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="prof-position" className="block text-[13px] font-medium text-foreground mb-1.5">Cargo</label>
            <input id="prof-position" type="text" {...register('position')} className={inputCls(!!errors.position)} />
            {errors.position && <p className="mt-1 text-xs text-red-500 m-0">{errors.position.message}</p>}
          </div>
        </div>

        {mode === 'create' && (
          <>
            <div className="mb-4">
              <label htmlFor="prof-email" className="block text-[13px] font-medium text-foreground mb-1.5">
                E-mail <span className="text-red-500">*</span>
              </label>
              <input id="prof-email" type="email" {...register('email')} className={inputCls(!!errors.email)} />
              {errors.email && <p className="mt-1 text-xs text-red-500 m-0">{errors.email.message}</p>}
            </div>

            <div className="mb-4 flex items-center gap-2.5">
              <input
                id="prof-send-invite"
                type="checkbox"
                {...register('sendInvite')}
                className="w-4 h-4 rounded border-border text-indigo-500 cursor-pointer accent-indigo-500"
              />
              <label htmlFor="prof-send-invite" className="text-[13px] font-medium text-foreground cursor-pointer select-none">
                Enviar convite por e-mail para o usuário cadastrar a senha
              </label>
            </div>

            {!sendInviteValue && (
              <div>
                <label htmlFor="prof-password" className="block text-[13px] font-medium text-foreground mb-1.5">
                  Senha inicial <span className="text-red-500">*</span>
                </label>
                <input id="prof-password" type="password" {...register('password')} className={inputCls(!!errors.password)} />
                {errors.password && <p className="mt-1 text-xs text-red-500 m-0">{errors.password.message}</p>}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Card 2: Perfil ── */}
      <div className="bg-background border border-border rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-foreground m-0 mb-5">Perfil</p>

        <div className="mb-4">
          <label htmlFor="prof-bio" className="block text-[13px] font-medium text-foreground mb-1.5">Observações</label>
          <textarea
            id="prof-bio"
            {...register('bio')}
            rows={3}
            className="w-full px-3 py-2.5 text-sm text-foreground bg-background rounded-lg border border-border outline-none resize-y transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {showStatus && (
          <div className="max-w-[220px]">
            <label htmlFor="prof-active" className="block text-[13px] font-medium text-foreground mb-1.5">Status</label>
            <div className="relative">
              <select
                id="prof-active"
                value={activeValue ? 'true' : 'false'}
                onChange={(e) => setValue('active', e.target.value === 'true')}
                className={cn(inputCls(), 'appearance-none cursor-pointer')}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        )}

        {showStatus && !activeValue && userId && (
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

      {/* ── Card 3: Notificações ── */}
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

      {/* ── Card 5: Horários ── */}
      {showSchedule && (
        mode === 'create' ? (
          <ScheduleCard
            mode="create"
            value={schedule}
            onChange={setSchedule}
          />
        ) : (
          <ScheduleCard
            mode="edit"
            professionalId={professionalId!}
          />
        )
      )}

      {/* ── Card 6: Dias e Horários Não Disponíveis ── */}
      {showSchedule && (
        mode === 'create' ? (
          <ExceptionsCard
            mode="create"
            value={exceptions}
            onChange={setExceptions}
          />
        ) : (
          <ExceptionsCard
            mode="edit"
            professionalId={professionalId!}
          />
        )
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
          {mode === 'create' ? 'Cadastrar profissional' : 'Salvar alterações'}
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
