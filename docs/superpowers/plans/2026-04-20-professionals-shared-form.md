# Professionals Shared Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extrair o formulário de profissional em um componente `ProfessionalForm` compartilhado entre as páginas de criação e edição.

**Architecture:** Um único componente `ProfessionalForm` recebe `mode`, `defaultValues`, `onSubmit`, `isAdmin` e `isOwnProfile`. Internamente usa React Hook Form + Zod com dois schemas distintos selecionados por `mode`. As páginas `new/page.tsx` e `[id]/edit/page.tsx` ficam finas — apenas buscam dados (edit) e orquestram navegação.

**Tech Stack:** React Hook Form, Zod (`zod/v3`), Tailwind, `cn()`, `AvatarCropField`, Next.js App Router.

---

## Arquivos envolvidos

| Ação | Arquivo |
|---|---|
| Criar | `packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalForm.tsx` |
| Modificar | `packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx` |
| Modificar | `packages/web/src/app/(tenant)/(app)/professionals/[id]/edit/page.tsx` |

---

## Task 1: Criar `ProfessionalForm.tsx`

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalForm.tsx`

- [ ] **Step 1: Criar o diretório `_components`**

```bash
mkdir -p packages/web/src/app/\(tenant\)/\(app\)/professionals/_components
```

- [ ] **Step 2: Escrever o componente `ProfessionalForm.tsx`**

Crie `packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalForm.tsx` com o conteúdo abaixo:

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { AvatarCropField } from '@/components/ui/AvatarCropField'
import { cn } from '@/lib/utils'

// ── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  email:     z.string().email('E-mail inválido'),
  password:  z.string().min(8, 'Mínimo 8 caracteres'),
  position:  z.string().optional(),
  bio:       z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
})

const editSchema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  position:  z.string().optional(),
  bio:       z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  active:    z.boolean().optional(),
})

// ── Types ─────────────────────────────────────────────────────────────────────

type FormValues = {
  name:      string
  email?:    string
  password?: string
  position?: string
  bio?:      string
  avatarUrl?: string | null
  active?:   boolean
}

export type ProfessionalFormData = FormValues

export type ProfessionalFormProps = {
  mode:           'create' | 'edit'
  defaultValues?: Partial<FormValues>
  onSubmit:       (data: ProfessionalFormData) => Promise<void>
  onCancel?:      () => void
  isAdmin?:       boolean
  isOwnProfile?:  boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = (hasError = false) => cn(
  'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
  hasError ? 'border-red-400' : 'border-gray-200',
)

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfessionalForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isAdmin,
  isOwnProfile,
}: ProfessionalFormProps) {
  const schema = mode === 'create' ? createSchema : editSchema

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      name:      defaultValues?.name      ?? '',
      position:  defaultValues?.position  ?? '',
      bio:       defaultValues?.bio       ?? '',
      avatarUrl: defaultValues?.avatarUrl ?? null,
      ...(mode === 'create' ? { email: '', password: '' } : {}),
      ...(mode === 'edit'   ? { active: defaultValues?.active ?? true } : {}),
    },
  })

  const nameValue   = watch('name') ?? ''
  const avatarValue = watch('avatarUrl') ?? null
  const activeValue = watch('active') ?? true
  const showStatus  = mode === 'edit' && isAdmin && !isOwnProfile

  async function submit(data: FormValues) {
    try {
      await onSubmit(data)
    } catch {
      setError('root', { message: 'Não foi possível salvar. Verifique os dados e tente novamente.' })
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>

      {/* ── Card 1: Dados pessoais ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Dados pessoais</p>

        <div className="mb-5">
          <AvatarCropField
            value={avatarValue}
            onChange={(v) => setValue('avatarUrl', v)}
            name={nameValue}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input type="text" {...register('name')} className={inputCls(!!errors.name)} />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500 m-0">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Cargo</label>
            <input type="text" {...register('position')} className={inputCls()} />
          </div>
        </div>

        {mode === 'create' && (
          <>
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                E-mail <span className="text-red-500">*</span>
              </label>
              <input type="email" {...register('email')} className={inputCls(!!errors.email)} />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 m-0">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Senha inicial <span className="text-red-500">*</span>
              </label>
              <input type="password" {...register('password')} className={inputCls(!!errors.password)} />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 m-0">{errors.password.message}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Card 2: Perfil ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Perfil</p>

        <div className="mb-4">
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Observações</label>
          <textarea
            {...register('bio')}
            rows={3}
            className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none resize-y transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {showStatus && (
          <div className="max-w-[220px]">
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Status</label>
            <div className="relative">
              <select
                value={activeValue ? 'true' : 'false'}
                onChange={(e) => setValue('active', e.target.value === 'true')}
                className={cn(inputCls(), 'appearance-none cursor-pointer')}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
              <svg
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500"
                width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {errors.root && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
          {errors.root.message}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Salvando...
            </>
          ) : mode === 'create' ? 'Cadastrar profissional' : 'Salvar alterações'}
        </button>

        {mode === 'edit' && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-[42px] px-5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

    </form>
  )
}
```

- [ ] **Step 3: Verificar que o TypeScript compila sem erros**

```bash
cd packages/web && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros relacionados a `ProfessionalForm.tsx`. Erros pré-existentes em outros arquivos podem ser ignorados.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/\(tenant\)/\(app\)/professionals/_components/ProfessionalForm.tsx
git commit -m "feat: add shared ProfessionalForm component"
```

---

## Task 2: Simplificar `new/page.tsx`

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx`

- [ ] **Step 1: Substituir o conteúdo de `new/page.tsx`**

Substitua o arquivo inteiro por:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCreateProfessional } from '@/hooks/useProfessionals'
import { BackButton } from '@/components/ui/BackButton'
import { ProfessionalForm, type ProfessionalFormData } from '../_components/ProfessionalForm'

export default function NewProfessionalPage() {
  const router = useRouter()
  const { mutateAsync } = useCreateProfessional()

  async function handleSubmit(data: ProfessionalFormData) {
    await mutateAsync({
      name:      data.name,
      email:     data.email!,
      password:  data.password!,
      position:  data.position,
      bio:       data.bio,
      avatarUrl: data.avatarUrl ?? undefined,
    })
    router.push('/professionals')
  }

  return (
    <div className="max-w-[560px]">
      <BackButton href="/professionals" variant="ghost">Voltar para profissionais</BackButton>
      <ProfessionalForm mode="create" onSubmit={handleSubmit} />
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd packages/web && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem novos erros.

- [ ] **Step 3: Testar manualmente o fluxo de criação**

1. Abrir `http://localhost:3000/<slug>/professionals/new`
2. Verificar que o formulário renderiza com dois cards: "Dados pessoais" e "Perfil"
3. Verificar que os campos aparecem: Avatar, Nome, Cargo, E-mail, Senha, Observações
4. Submeter sem preencher campos obrigatórios → erros inline devem aparecer em Nome, E-mail e Senha
5. Preencher todos os campos e submeter → redireciona para `/professionals` e profissional aparece na lista

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/\(tenant\)/\(app\)/professionals/new/page.tsx
git commit -m "refactor: simplify new professional page to use ProfessionalForm"
```

---

## Task 3: Simplificar `[id]/edit/page.tsx`

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/[id]/edit/page.tsx`

- [ ] **Step 1: Substituir o conteúdo de `[id]/edit/page.tsx`**

Substitua o arquivo inteiro por:

```tsx
'use client'

import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProfessional, useUpdateProfessional } from '@/hooks/useProfessionals'
import { BackButton } from '@/components/ui/BackButton'
import { ProfessionalForm, type ProfessionalFormData } from '../_components/ProfessionalForm'

export default function EditProfessionalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me, updateUser } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: prof, isLoading } = useProfessional(id)
  const isOwnProfile = !!prof && prof.userId === me?.id
  const { mutateAsync } = useUpdateProfessional(id)

  if (isLoading || !prof) {
    return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  }

  async function handleSubmit(data: ProfessionalFormData) {
    await mutateAsync({
      name:      data.name,
      position:  data.position,
      bio:       data.bio,
      avatarUrl: data.avatarUrl ?? undefined,
      role:      'professional',
      ...(isAdmin ? { active: data.active } : {}),
    })
    if (isOwnProfile) {
      updateUser({ name: data.name, avatarUrl: data.avatarUrl ?? null })
    }
    router.push(`/professionals/${id}`)
  }

  return (
    <div>
      <div className="mb-7">
        <BackButton href={`/professionals/${id}`}>Voltar para profissional</BackButton>
      </div>
      <ProfessionalForm
        mode="edit"
        defaultValues={prof}
        isAdmin={isAdmin}
        isOwnProfile={isOwnProfile}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/professionals/${id}`)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd packages/web && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem novos erros.

- [ ] **Step 3: Testar manualmente o fluxo de edição como admin**

1. Logar como `admin@clinica-demo.com` / `password123`
2. Abrir `/professionals` e clicar em um profissional qualquer (não o admin)
3. Clicar em Editar
4. Verificar que o formulário renderiza com dados pré-preenchidos: Avatar, Nome, Cargo, Observações
5. Verificar que o campo **Status** (Ativo/Inativo) aparece (admin editando outro usuário)
6. Verificar que **E-mail** e **Senha** NÃO aparecem
7. Alterar o Nome e salvar → redireciona para detalhe e nome atualizado
8. Submeter com Nome em branco → erro inline "Nome obrigatório" deve aparecer

- [ ] **Step 4: Testar como profissional editando o próprio perfil**

1. Logar como `dra..ana.lima@clinica-demo.com` / `password123`
2. Ir para `/professionals/me` → redireciona para o perfil próprio
3. Clicar em Editar
4. Verificar que o campo **Status** NÃO aparece (profissional editando próprio perfil)
5. Alterar bio e salvar → redireciona para detalhe com bio atualizada

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/\(tenant\)/\(app\)/professionals/\[id\]/edit/page.tsx
git commit -m "refactor: simplify edit professional page to use ProfessionalForm"
```
