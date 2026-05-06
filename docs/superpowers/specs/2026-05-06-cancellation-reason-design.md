# Motivo de Cancelamento de Agendamento

**Data:** 2026-05-06
**Status:** Aprovado

## Objetivo

Permitir que cada tenant configure se o usuário deve preencher um motivo ao cancelar um agendamento. O motivo é persistido no banco para consulta futura. A configuração tem três modos: desabilitado, opcional e obrigatório.

---

## 1. Schema & Migration

### `packages/shared/src/schema/tenants.schema.ts`

- Novo pgEnum `cancellation_reason_mode` com valores `['no', 'optional', 'required']`
- Nova coluna `cancellationReasonMode` na tabela `tenants`, tipo `cancellation_reason_mode`, `NOT NULL DEFAULT 'no'`

### `packages/shared/src/schema/appointments.schema.ts`

- Nova coluna `cancellationReason: text` (nullable) na tabela `appointments`

### Migration

Gerada via `pnpm db:generate` e aplicada via `pnpm db:migrate`. A migration deve:
1. Criar o enum `cancellation_reason_mode`
2. Adicionar a coluna `cancellation_reason_mode` em `tenants` com default `'no'`
3. Adicionar a coluna `cancellation_reason` em `appointments` (nullable)

---

## 2. Backend (`packages/api`)

### `src/tenants/dto/update-tenant.dto.ts`
- Novo campo: `cancellationReasonMode?: 'no' | 'optional' | 'required'` com `@IsOptional()` e `@IsIn([...])`

### `src/tenants/tenants.service.ts`
- `findCurrent()`: incluir `cancellationReasonMode` no `select()`
- `update()`: incluir `cancellationReasonMode` no patch

### `src/appointments/dto/cancel-appointment.dto.ts` (novo arquivo)
```ts
export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
```

### `src/appointments/appointments.controller.ts`
- Endpoint `cancel()`: recebe `@Body() dto: CancelAppointmentDto` e repassa `dto.reason` ao service

### `src/appointments/appointments.service.ts`
- `updateStatus()`: aceita parâmetro opcional `reason?: string`
- Quando `status === 'cancelled'` e `reason` for fornecido, inclui `cancellationReason: reason` no `set()`

---

## 3. Frontend (`packages/web`)

### `src/hooks/useTenantSettings.ts`
- Tipo `TenantSettings`: adiciona `cancellationReasonMode: 'no' | 'optional' | 'required'`
- Hook `useUpdateTenantSettings`: adiciona campo ao tipo do body da mutation

### `src/providers/TenantSettingsProvider.tsx`
- Contexto `TenantSettingsContextValue`: adiciona `cancellationReasonMode`
- Default: `'no'`
- Provider expõe o valor via `useTenantSettingsContext()`

### `src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx`
- Na seção **Comportamento**, adiciona novo item após "Exigir confirmação":
  - Label: **Motivo de cancelamento**
  - Descrição: _"Define se o usuário precisa informar um motivo ao cancelar um agendamento."_
  - Controle: seletor segmentado de 3 pills (`Não · Sim · Obrigatório`), salvo via `mutateAsync` com `toggleSaving` próprio (key: `'cancelReason'`)
  - Estado local: `cancelReasonMode: 'no' | 'optional' | 'required'`
  - Inicializado via `useEffect` a partir de `data.cancellationReasonMode`

### `src/hooks/useAppointments.ts`
- `useCancelAppointment`: muda a assinatura de `mutationFn: (id: string)` para `mutationFn: ({ id, reason }: { id: string; reason?: string })`
- Body da requisição: `JSON.stringify({ reason })` (reason pode ser undefined)

### `src/app/(tenant)/(app)/appointments/_components/CancelAppointmentModal.tsx` (novo)

Props:
```ts
type Props = {
  appointmentId: string | null
  onClose: () => void
  onSuccess?: () => void
}
```

Comportamento:
- Se `appointmentId === null` → não renderiza nada
- Lê `cancellationReasonMode` via `useTenantSettingsContext()`
- Estado local: `reason: string` (default `''`)
- `mode === 'no'` → modal simples de confirmação (sem textarea)
- `mode === 'optional'` → exibe textarea (max 255 chars); botão habilitado sempre
- `mode === 'required'` → exibe textarea (max 255 chars); botão desabilitado quando `reason.trim().length < 3`
- Textarea: `placeholder="Informe o motivo do cancelamento"`, counter de chars `X/255`
- Ao confirmar: chama `cancelMut.mutate({ id: appointmentId, reason: reason.trim() || undefined })`
- `onSuccess` chamado após sucesso da mutation (fecha o modal também via `onClose`)

### `src/app/(tenant)/(app)/appointments/page.tsx`
- Remove o bloco do modal inline de cancelamento (`{cancelId && (<div ...>)`)
- Adiciona `<CancelAppointmentModal appointmentId={cancelId} onClose={() => setCancelId(null)} />`
- Remove o hook `useCancelAppointment` local (o modal o encapsula)
- Remove a função `confirmCancel` local

### `src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx`
- Adiciona estado `cancelOpen: boolean` (default `false`)
- Remove o `cancelMut` local e a chamada direta em `handleStatusChange('cancel')`
- Ao clicar em "Cancelar" no dropdown: fecha o dropdown e seta `cancelOpen = true`
- Renderiza `<CancelAppointmentModal appointmentId={cancelOpen ? appointment.id : null} onClose={() => setCancelOpen(false)} onSuccess={onClose} />`
- Remove import de `useCancelAppointment`

---

## Fluxo completo

```
Usuário clica "Cancelar"
  → CancelAppointmentModal abre
  → mode === 'no'        → confirmação simples
  → mode === 'optional'  → textarea (pode deixar em branco)
  → mode === 'required'  → textarea obrigatória (min 3 chars)
  → Confirma
  → PATCH /appointments/:id/cancel  { reason: "..." }
  → API persiste cancellationReason na linha do appointment
  → Cache TanStack Query invalidado
  → Modal fecha
```

---

## Restrições & invariantes

- `cancellationReason` só é gravado quando `status === 'cancelled'`; outros status passam `reason` como `undefined` (campo ignorado no service)
- A validação de min 3 chars é **somente no frontend** quando mode é `'required'`; a API não rejeita reasons curtos (o DTO usa apenas `@MaxLength(255)`)
- O enum `cancellation_reason_mode` deve ter RLS-safe default `'no'` para não quebrar tenants existentes
- `cancellationReason` na tabela `appointments` é nullable para retrocompatibilidade com cancelamentos históricos

---

## Arquivos a criar/modificar

| Ação | Arquivo |
|------|---------|
| Modificar | `packages/shared/src/schema/tenants.schema.ts` |
| Modificar | `packages/shared/src/schema/appointments.schema.ts` |
| Gerar + Aplicar | `packages/api/migrations/000X_cancellation_reason.sql` |
| Modificar | `packages/api/src/tenants/dto/update-tenant.dto.ts` |
| Modificar | `packages/api/src/tenants/tenants.service.ts` |
| Criar | `packages/api/src/appointments/dto/cancel-appointment.dto.ts` |
| Modificar | `packages/api/src/appointments/appointments.controller.ts` |
| Modificar | `packages/api/src/appointments/appointments.service.ts` |
| Modificar | `packages/web/src/hooks/useTenantSettings.ts` |
| Modificar | `packages/web/src/providers/TenantSettingsProvider.tsx` |
| Modificar | `packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx` |
| Modificar | `packages/web/src/hooks/useAppointments.ts` |
| Criar | `packages/web/src/app/(tenant)/(app)/appointments/_components/CancelAppointmentModal.tsx` |
| Modificar | `packages/web/src/app/(tenant)/(app)/appointments/page.tsx` |
| Modificar | `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx` |
