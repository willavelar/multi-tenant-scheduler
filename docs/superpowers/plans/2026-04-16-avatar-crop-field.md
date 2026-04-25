# Avatar Crop Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an editable avatar field with square crop to professional and client create/edit forms, storing the result as 256×256 JPEG base64 in `avatarUrl`.

**Architecture:** A single reusable `AvatarCropField` component handles file picking, `react-easy-crop` modal, and canvas export. The component is wired into four forms (professionals/new, professionals/edit, clients/new, clients/edit). The clients side requires a schema column, API DTO, and service changes; professionals already have full backend support.

**Tech Stack:** react-easy-crop, HTML5 Canvas API, FileReader, Drizzle ORM (schema migration), class-validator decorators

---

## File Structure

**Create:**
- `packages/web/src/components/ui/AvatarCropField.tsx` — reusable avatar picker + crop modal

**Modify:**
- `packages/shared/src/schema/client-profiles.schema.ts` — add `avatarUrl` column
- `packages/api/src/clients/dto/create-client.dto.ts` — add `avatarUrl` field
- `packages/api/src/clients/dto/update-client.dto.ts` — add `avatarUrl` field
- `packages/api/src/clients/clients.service.ts` — expose and store `avatarUrl` (FIELDS, create, update)
- `packages/web/src/types/index.ts` — add `avatarUrl` to `Client`
- `packages/web/src/hooks/useClients.ts` — add `avatarUrl` to `useCreateClient` and `useUpdateClient`
- `packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx` — integrate AvatarCropField
- `packages/web/src/app/(tenant)/(app)/professionals/[id]/edit/page.tsx` — integrate AvatarCropField
- `packages/web/src/app/(tenant)/(app)/clients/new/page.tsx` — integrate AvatarCropField
- `packages/web/src/app/(tenant)/(app)/clients/[id]/edit/page.tsx` — integrate AvatarCropField

---

### Task 1: Install react-easy-crop

**Files:**
- Modify: `packages/web/package.json` (automatic via pnpm)

- [ ] **Step 1: Install the package**

Run from repo root:
```bash
pnpm --filter web add react-easy-crop
```

Expected: `packages/web/package.json` gains `"react-easy-crop": "..."` in `dependencies`.

- [ ] **Step 2: Verify the type definitions are bundled**

```bash
ls packages/web/node_modules/react-easy-crop/dist/index.d.ts
```

Expected: file exists (types are bundled — no `@types/react-easy-crop` needed).

- [ ] **Step 3: Commit**

```bash
git add packages/web/package.json pnpm-lock.yaml
git commit -m "chore: install react-easy-crop"
```

---

### Task 2: Add avatarUrl column to client_profiles schema and migrate

**Files:**
- Modify: `packages/shared/src/schema/client-profiles.schema.ts`

- [ ] **Step 1: Add the column to the schema**

In `packages/shared/src/schema/client-profiles.schema.ts`, add `avatarUrl` after `serviceLimitPeriod`:

```typescript
import { boolean, date, integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';
import { users } from './users.schema';

export const serviceLimitPeriodEnum = pgEnum('service_limit_period', ['day', 'week', 'month']);

export const clientProfiles = pgTable('client_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  birthDate: date('birth_date'),
  notes: text('notes'),
  active: boolean('active').notNull().default(true),
  allProfessionals: boolean('all_professionals').notNull().default(false),
  allServices: boolean('all_services').notNull().default(false),
  serviceLimitCount: integer('service_limit_count'),
  serviceLimitPeriod: serviceLimitPeriodEnum('service_limit_period'),
  avatarUrl: text('avatar_url'),
});

export type ClientProfile = typeof clientProfiles.$inferSelect;
export type NewClientProfile = typeof clientProfiles.$inferInsert;
```

- [ ] **Step 2: Generate and apply the migration**

```bash
pnpm db:generate
pnpm db:migrate
```

Expected: a new SQL migration file appears in `packages/api/drizzle/` containing `ALTER TABLE "client_profiles" ADD COLUMN "avatar_url" text;`. Migration applies without error.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/schema/client-profiles.schema.ts packages/api/drizzle/
git commit -m "feat: add avatar_url column to client_profiles"
```

---

### Task 3: Update clients API DTOs and service

**Files:**
- Modify: `packages/api/src/clients/dto/create-client.dto.ts`
- Modify: `packages/api/src/clients/dto/update-client.dto.ts`
- Modify: `packages/api/src/clients/clients.service.ts`

- [ ] **Step 1: Add avatarUrl to CreateClientDto**

Replace the entire `packages/api/src/clients/dto/create-client.dto.ts`:

```typescript
import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Min, MinLength } from 'class-validator';

export class CreateClientDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() avatarUrl?: string;

  @IsOptional() @IsInt() @Min(1) serviceLimitCount?: number;
  @IsOptional() @IsIn(['day', 'week', 'month']) serviceLimitPeriod?: 'day' | 'week' | 'month';

  @IsOptional() @IsBoolean() allProfessionals?: boolean;
  @IsOptional() @IsBoolean() allServices?: boolean;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) professionalIds?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) serviceIds?: string[];
}
```

- [ ] **Step 2: Add avatarUrl to UpdateClientDto**

Replace the entire `packages/api/src/clients/dto/update-client.dto.ts`:

```typescript
import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';

export class UpdateClientDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() avatarUrl?: string;

  @IsOptional() @IsInt() @Min(1) serviceLimitCount?: number | null;
  @IsOptional() @IsIn(['day', 'week', 'month']) serviceLimitPeriod?: 'day' | 'week' | 'month' | null;

  @IsOptional() @IsBoolean() allProfessionals?: boolean;
  @IsOptional() @IsBoolean() allServices?: boolean;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) professionalIds?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) serviceIds?: string[];
}
```

- [ ] **Step 3: Add avatarUrl to clients.service.ts FIELDS**

In `packages/api/src/clients/clients.service.ts`, in the `FIELDS` object inside `findAll` (around line 41), add `avatarUrl` after `active`:

```typescript
      const FIELDS = {
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        profileId: clientProfiles.id,
        birthDate: clientProfiles.birthDate,
        notes: clientProfiles.notes,
        active: clientProfiles.active,
        avatarUrl: clientProfiles.avatarUrl,
        allProfessionals: clientProfiles.allProfessionals,
        allServices: clientProfiles.allServices,
        serviceLimitCount: clientProfiles.serviceLimitCount,
        serviceLimitPeriod: clientProfiles.serviceLimitPeriod,
      };
```

- [ ] **Step 4: Add avatarUrl to findOne inline select**

In `findOne` (around line 79), add `avatarUrl: clientProfiles.avatarUrl` after `active: clientProfiles.active`:

```typescript
      const [row] = await tx
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          profileId: clientProfiles.id,
          birthDate: clientProfiles.birthDate,
          notes: clientProfiles.notes,
          active: clientProfiles.active,
          avatarUrl: clientProfiles.avatarUrl,
          allProfessionals: clientProfiles.allProfessionals,
          allServices: clientProfiles.allServices,
          serviceLimitCount: clientProfiles.serviceLimitCount,
          serviceLimitPeriod: clientProfiles.serviceLimitPeriod,
        })
        .from(users)
        .leftJoin(clientProfiles, eq(clientProfiles.userId, users.id))
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId), eq(users.role, 'client')));
```

- [ ] **Step 5: Store avatarUrl in create**

In the `create` method (around line 142), in the `clientProfiles` insert `.values({...})`, add `avatarUrl: dto.avatarUrl` after `active`:

```typescript
      const [profile] = await tx
        .insert(clientProfiles)
        .values({
          tenantId,
          userId: user.id,
          birthDate: dto.birthDate,
          notes: dto.notes,
          active: dto.active ?? true,
          avatarUrl: dto.avatarUrl,
          allProfessionals: dto.allProfessionals ?? false,
          allServices: dto.allServices ?? false,
          serviceLimitCount: dto.serviceLimitCount,
          serviceLimitPeriod: dto.serviceLimitPeriod,
        })
        .returning();
```

- [ ] **Step 6: Store avatarUrl in update**

In the `update` method (around line 191), in the `profilePatch` block, add `avatarUrl` after the `active` line:

```typescript
      if (dto.birthDate            !== undefined) profilePatch.birthDate            = dto.birthDate;
      if (dto.notes                !== undefined) profilePatch.notes                = dto.notes;
      if (dto.active               !== undefined) profilePatch.active               = dto.active;
      if (dto.avatarUrl            !== undefined) profilePatch.avatarUrl            = dto.avatarUrl;
      if (dto.allProfessionals     !== undefined) profilePatch.allProfessionals     = dto.allProfessionals;
      if (dto.allServices          !== undefined) profilePatch.allServices          = dto.allServices;
      if (dto.serviceLimitCount    !== undefined) profilePatch.serviceLimitCount    = dto.serviceLimitCount;
      if (dto.serviceLimitPeriod   !== undefined) profilePatch.serviceLimitPeriod   = dto.serviceLimitPeriod;
```

- [ ] **Step 7: Run API tests to verify no regressions**

```bash
pnpm test:api
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/clients/dto/create-client.dto.ts \
        packages/api/src/clients/dto/update-client.dto.ts \
        packages/api/src/clients/clients.service.ts
git commit -m "feat: expose and store avatarUrl in clients API"
```

---

### Task 4: Update frontend types and hooks for clients

**Files:**
- Modify: `packages/web/src/types/index.ts`
- Modify: `packages/web/src/hooks/useClients.ts`

- [ ] **Step 1: Add avatarUrl to Client type**

In `packages/web/src/types/index.ts`, add `avatarUrl: string | null` to the `Client` type after `active`:

```typescript
export type Client = {
  id: string
  name: string
  email: string
  phone: string | null
  lastLoginAt: string | null
  createdAt: string
  profileId: string | null
  birthDate: string | null
  notes: string | null
  active: boolean | null
  avatarUrl: string | null
  allProfessionals: boolean | null
  allServices: boolean | null
  serviceLimitCount: number | null
  serviceLimitPeriod: 'day' | 'week' | 'month' | null
}
```

- [ ] **Step 2: Add avatarUrl to useCreateClient and useUpdateClient**

In `packages/web/src/hooks/useClients.ts`:

In `useCreateClient`, add `avatarUrl?: string` to the `mutationFn` body type:

```typescript
export function useCreateClient() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: {
      name: string; email: string; password: string;
      phone?: string; birthDate?: string; notes?: string;
      active?: boolean; avatarUrl?: string; allProfessionals?: boolean; allServices?: boolean;
      serviceLimitCount?: number; serviceLimitPeriod?: string;
      professionalIds?: string[]; serviceIds?: string[];
    }) => api('/clients', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients', slug] }),
  })
}
```

In `useUpdateClient`, add `avatarUrl?: string` to the `mutationFn` body type:

```typescript
export function useUpdateClient(id: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: {
      name?: string; email?: string; phone?: string;
      birthDate?: string; notes?: string; active?: boolean; avatarUrl?: string;
      allProfessionals?: boolean; allServices?: boolean;
      serviceLimitCount?: number | null; serviceLimitPeriod?: string | null;
      professionalIds?: string[]; serviceIds?: string[];
    }) => api(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', slug, id] })
      queryClient.invalidateQueries({ queryKey: ['clients', slug] })
    },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/types/index.ts packages/web/src/hooks/useClients.ts
git commit -m "feat: add avatarUrl to Client type and hooks"
```

---

### Task 5: Create AvatarCropField component

**Files:**
- Create: `packages/web/src/components/ui/AvatarCropField.tsx`

- [ ] **Step 1: Create the component**

Create `packages/web/src/components/ui/AvatarCropField.tsx`:

```typescript
'use client'

import { useState, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']

function pickColor(str: string) {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = new Image()
  image.src = imageSrc
  await new Promise<void>((resolve) => { image.onload = () => resolve() })

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, 256, 256,
  )

  return canvas.toDataURL('image/jpeg', 0.9)
}

interface AvatarCropFieldProps {
  value: string | null
  onChange: (v: string | null) => void
  name: string
}

export function AvatarCropField({ value, onChange, name }: AvatarCropFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setModalOpen(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleCrop() {
    if (!imageSrc || !croppedAreaPixels) return
    const base64 = await getCroppedImg(imageSrc, croppedAreaPixels)
    onChange(base64)
    setModalOpen(false)
    setImageSrc(null)
  }

  function handleCancel() {
    setModalOpen(false)
    setImageSrc(null)
  }

  return (
    <>
      <div
        className="relative inline-block cursor-pointer group"
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <img
            src={value}
            alt="Avatar"
            className="w-20 h-20 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold select-none"
            style={{ background: name ? pickColor(name) : '#6366f1' }}
          >
            {name ? initials(name) : '?'}
          </div>
        )}
        <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {modalOpen && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-xl w-[400px] overflow-hidden">
            <div className="relative h-[300px] bg-gray-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="px-5 py-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button
                type="button"
                onClick={handleCancel}
                className="h-9 px-4 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCrop}
                className="h-9 px-4 bg-indigo-500 text-white rounded-lg text-sm font-semibold cursor-pointer hover:bg-indigo-600 transition-colors"
              >
                Recortar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors from `AvatarCropField.tsx`.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/AvatarCropField.tsx
git commit -m "feat: create AvatarCropField component with react-easy-crop"
```

---

### Task 6: Integrate AvatarCropField into professional forms

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/[id]/edit/page.tsx`

#### professionals/new/page.tsx

- [ ] **Step 1: Add AvatarCropField to professionals/new**

Replace the entire file `packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter } from 'next/navigation'
import { useCreateProfessional } from '@/hooks/useProfessionals'
import { AvatarCropField } from '@/components/ui/AvatarCropField'
import { BackButton } from '@/components/ui/BackButton'
import { cn } from '@/lib/utils'

const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  email:     z.string().email('E-mail inválido'),
  password:  z.string().min(8, 'Mínimo 8 caracteres'),
  position:  z.string().optional(),
  bio:       z.string().optional(),
})
type FormData = z.infer<typeof schema>

const inputCls = (hasError: boolean) => cn(
  'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
  hasError ? 'border-red-400' : 'border-gray-200'
)

export default function NewProfessionalPage() {
  const router = useRouter()
  const create = useCreateProfessional()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, watch } = useForm<FormData>({ resolver: zodResolver(schema) })
  const nameValue = watch('name') ?? ''

  async function onSubmit(data: FormData) {
    try {
      await create.mutateAsync({ ...data, avatarUrl: avatarUrl ?? undefined })
      router.push('/professionals')
    } catch {
      setError('root', { message: 'Não foi possível cadastrar. Verifique os dados e tente novamente.' })
    }
  }

  return (
    <div className="max-w-[560px]">
      <BackButton href="/professionals" variant="ghost">Voltar para profissionais</BackButton>

      <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 m-0 mb-6">Dados do profissional</h2>

        <div className="mb-6">
          <AvatarCropField value={avatarUrl} onChange={setAvatarUrl} name={nameValue} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {[
            { key: 'name',     label: 'Nome completo', type: 'text',     required: true },
            { key: 'email',    label: 'E-mail',        type: 'email',    required: true },
            { key: 'password', label: 'Senha inicial', type: 'password', required: true },
            { key: 'position', label: 'Cargo',         type: 'text',     required: false },
          ].map(({ key, label, type, required }) => (
            <div key={key} className="mb-4">
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                {label}{required && <span className="text-red-500"> *</span>}
              </label>
              <input
                id={key}
                type={type}
                {...register(key as keyof FormData)}
                className={inputCls(!!errors[key as keyof FormData])}
              />
              {errors[key as keyof FormData] && (
                <p className="mt-1 text-xs text-red-500 m-0">
                  {errors[key as keyof FormData]?.message}
                </p>
              )}
            </div>
          ))}

          <div className="mb-6">
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              {...register('bio')}
              rows={3}
              className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none resize-y transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          {errors.root && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
              {errors.root.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[42px] bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Salvando...
              </>
            ) : 'Cadastrar profissional'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

#### professionals/[id]/edit/page.tsx

- [ ] **Step 2: Add AvatarCropField to professionals/[id]/edit**

Replace the entire file `packages/web/src/app/(tenant)/(app)/professionals/[id]/edit/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProfessional, useUpdateProfessional } from '@/hooks/useProfessionals'
import { AvatarCropField } from '@/components/ui/AvatarCropField'
import { BackButton } from '@/components/ui/BackButton'
import { cn } from '@/lib/utils'

export default function EditProfessionalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: prof, isLoading } = useProfessional(id)
  const update = useUpdateProfessional(id)

  const [ready, setReady] = useState(false)
  const [name, setName]         = useState('')
  const [position, setPosition] = useState('')
  const [bio, setBio]           = useState('')
  const [active, setActive]     = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!prof || ready) return
    setName(prof.name)
    setPosition(prof.position ?? '')
    setBio(prof.bio ?? '')
    setActive(prof.active)
    setAvatarUrl(prof.avatarUrl ?? null)
    setReady(true)
  }, [prof, ready])

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setError('')
    try {
      const patch: Record<string, unknown> = {
        name: name.trim(),
        position: position.trim() || undefined,
        bio: bio.trim() || undefined,
        role: 'professional',
        avatarUrl: avatarUrl ?? undefined,
      }
      if (isAdmin) {
        patch.active = active
      }
      await update.mutateAsync(patch)
      router.push(`/professionals/${id}`)
    } catch {
      setError('Não foi possível salvar as alterações. Verifique os dados e tente novamente.')
    }
  }

  if (isLoading || !ready) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>

  const inputCls = 'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10'
  const selectCls = cn(inputCls, 'appearance-none cursor-pointer')

  return (
    <div>
      <div className="mb-7">
        <BackButton href={`/professionals/${id}`}>Voltar para profissional</BackButton>
      </div>

      <form onSubmit={handleSubmit} noValidate>

        {/* Personal data */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 m-0 mb-5">Dados pessoais</p>

          <div className="mb-5">
            <AvatarCropField value={avatarUrl} onChange={setAvatarUrl} name={name} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Nome completo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Cargo</label>
              <input
                type="text"
                value={position}
                onChange={e => setPosition(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 m-0 mb-5">Perfil</p>

          <div className="mb-4">
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none resize-y transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          {isAdmin && (
            <div className="max-w-[220px]">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Status</label>
                <div className="relative">
                  <select
                    value={active ? 'true' : 'false'}
                    onChange={e => setActive(e.target.value === 'true')}
                    className={selectCls}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={update.isPending}
            className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
          >
            {update.isPending ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Salvando...
              </>
            ) : 'Salvar alterações'}
          </button>
          <button
            type="button"
            className="h-[42px] px-5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => router.push(`/professionals/${id}`)}
          >
            Cancelar
          </button>
        </div>

      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx \
        packages/web/src/app/(tenant)/(app)/professionals/[id]/edit/page.tsx
git commit -m "feat: integrate AvatarCropField into professional forms"
```

---

### Task 7: Integrate AvatarCropField into client forms

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/clients/new/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/clients/[id]/edit/page.tsx`

#### clients/new/page.tsx

- [ ] **Step 1: Add avatar state and import**

In `packages/web/src/app/(tenant)/(app)/clients/new/page.tsx`:

1. Add import at the top (after the existing imports):
```typescript
import { AvatarCropField } from '@/components/ui/AvatarCropField'
```

2. Add state inside `NewClientPage` (after the `create` line):
```typescript
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
```

Note: `useState` is already imported in this file.

- [ ] **Step 2: Render AvatarCropField in clients/new**

In the JSX, find the first card section (the one with "Dados pessoais" or the name/email fields). Add the `AvatarCropField` at the very top of that card, before the first label/input group. The exact location is the first `<div className="bg-white border border-gray-200 rounded-xl ...">` block in the form.

Add these lines immediately after the card's opening `<p>` heading (or as the first child):

```typescript
          <div className="mb-5">
            <AvatarCropField value={avatarUrl} onChange={setAvatarUrl} name={form.name} />
          </div>
```

- [ ] **Step 3: Pass avatarUrl to create.mutateAsync in clients/new**

Find the `create.mutateAsync(...)` call and add `avatarUrl: avatarUrl ?? undefined` to the body object. The call is in the submit handler. Pass it alongside the other fields:

```typescript
      await create.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        birthDate: form.birthDate || undefined,
        notes: form.notes.trim() || undefined,
        active: form.active,
        avatarUrl: avatarUrl ?? undefined,
        serviceLimitCount: form.serviceLimitCount ? parseInt(form.serviceLimitCount, 10) : undefined,
        serviceLimitPeriod: form.serviceLimitPeriod || undefined,
        allProfessionals: allProfs,
        allServices: allSvcs,
        professionalIds: allProfs ? undefined : selectedProfs.map(p => p.id),
        serviceIds: allSvcs ? undefined : selectedServiceIds,
      })
```

#### clients/[id]/edit/page.tsx

- [ ] **Step 4: Add avatar state and import in clients/edit**

In `packages/web/src/app/(tenant)/(app)/clients/[id]/edit/page.tsx`:

1. Add import:
```typescript
import { AvatarCropField } from '@/components/ui/AvatarCropField'
```

2. Add state inside `EditClientPage` (after `const [ready, setReady] = useState(false)`):
```typescript
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
```

3. In the `useEffect` that initializes the form from `client`, add initialization:
```typescript
    setAvatarUrl(client.avatarUrl ?? null)
```
Place this alongside the other `setForm(...)` call, inside the `if (!client || ready) return` guard.

- [ ] **Step 5: Render AvatarCropField in clients/edit**

In the JSX, add `AvatarCropField` at the top of the first card (before the name/email/phone inputs), same pattern as clients/new:

```typescript
          <div className="mb-5">
            <AvatarCropField value={avatarUrl} onChange={setAvatarUrl} name={form.name} />
          </div>
```

- [ ] **Step 6: Pass avatarUrl to update.mutateAsync in clients/edit**

Find the `update.mutateAsync(...)` call and add `avatarUrl: avatarUrl ?? undefined`:

```typescript
      await update.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        birthDate: form.birthDate || undefined,
        notes: form.notes.trim() || undefined,
        active: form.active,
        avatarUrl: avatarUrl ?? undefined,
        serviceLimitCount: form.serviceLimitCount ? parseInt(form.serviceLimitCount, 10) : undefined,
        serviceLimitPeriod: form.serviceLimitPeriod || undefined,
        allProfessionals: allProfs,
        allServices: allSvcs,
        professionalIds: allProfs ? undefined : selectedProfs.map(p => p.id),
        serviceIds: allSvcs ? undefined : selectedServiceIds,
      })
```

- [ ] **Step 7: TypeScript check**

```bash
cd packages/web && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/clients/new/page.tsx \
        packages/web/src/app/(tenant)/(app)/clients/[id]/edit/page.tsx
git commit -m "feat: integrate AvatarCropField into client forms"
```

---

## Self-Review

### Spec coverage

| Spec requirement | Covered by task |
|---|---|
| Circular 80px avatar with image or initials fallback | Task 5 |
| Camera icon overlay on hover | Task 5 |
| File input hidden, triggered on click | Task 5 |
| FileReader reads file, opens modal | Task 5 |
| react-easy-crop with aspect=1 | Task 1 + 5 |
| Zoom via scroll (handled by react-easy-crop natively) | Task 5 |
| "Recortar" button → canvas 256×256 JPEG → onChange(base64) | Task 5 |
| "Cancelar" → closes without changing value | Task 5 |
| avatarUrl column in client_profiles schema | Task 2 |
| Migration generated and applied | Task 2 |
| avatarUrl in clients API DTOs, FIELDS, create, update | Task 3 |
| avatarUrl in Client type and hooks | Task 4 |
| Integrated in professionals/new | Task 6 |
| Integrated in professionals/[id]/edit (with useEffect init) | Task 6 |
| Integrated in clients/new | Task 7 |
| Integrated in clients/[id]/edit (with useEffect init) | Task 7 |
| pickColor deterministic (same function as rest of project) | Task 5 |
| Professionals backend unchanged (avatarUrl already exists) | n/a |

### Type consistency

- `AvatarCropField` props: `value: string | null`, `onChange: (v: string | null) => void`, `name: string` — consistent across all 4 integration points
- `getCroppedImg` returns `Promise<string>` — called with `await` in `handleCrop`
- `avatarUrl: avatarUrl ?? undefined` pattern used in all 4 mutateAsync calls — consistent with optional field handling in all existing hooks
