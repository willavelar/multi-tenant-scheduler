# Tenant Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adds a "Configurações > Gerais" page where admins can edit tenant name and logo, with the logo replacing the sidebar brand area and the page title updating reactively.

**Architecture:** Backend exposes `GET/PATCH /tenants/me` (admin-only). Frontend has a `TenantSettingsProvider` (client context + TanStack Query) that feeds the Sidebar and `document.title`. Logo uses an extended `AvatarCropField` with configurable aspect ratio and output size.

**Tech Stack:** NestJS + Drizzle ORM (API), Next.js 16 App Router + TanStack Query + react-easy-crop (web), TypeScript throughout.

---

## File Map

**Create:**
- `packages/api/src/tenants/dto/update-tenant.dto.ts`
- `packages/api/src/tenants/tenants.controller.ts`
- `packages/web/src/hooks/useTenantSettings.ts`
- `packages/web/src/providers/TenantSettingsProvider.tsx`
- `packages/web/src/components/ui/LogoCropField.tsx`
- `packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx`
- `packages/web/src/app/(tenant)/(app)/settings/general/page.tsx`

**Modify:**
- `packages/api/src/tenants/tenants.service.ts` — add `findCurrent` + `update`
- `packages/api/src/tenants/tenants.module.ts` — register controller
- `packages/web/.env` — add `NEXT_PUBLIC_APP_NAME`
- `packages/web/src/components/ui/AvatarCropField.tsx` — add `aspect`, `outputWidth`, `outputHeight`, `shape` props
- `packages/web/src/app/(tenant)/(app)/layout.tsx` — wrap with `TenantSettingsProvider`
- `packages/web/src/components/AppShell/Sidebar.tsx` — logo display + settings nav + reactive tenant name

---

## Task 1: Backend — DTO + TenantsService methods

**Files:**
- Create: `packages/api/src/tenants/dto/update-tenant.dto.ts`
- Modify: `packages/api/src/tenants/tenants.service.ts`

- [ ] **Step 1: Create the DTO**

```ts
// packages/api/src/tenants/dto/update-tenant.dto.ts
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;
}
```

- [ ] **Step 2: Add `findCurrent` and `update` to TenantsService**

Open `packages/api/src/tenants/tenants.service.ts`. The current file imports `eq` and `tenants`. Add the two new methods (keep `resolveTenantId` unchanged):

```ts
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenants } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { REDIS } from '../redis/redis.module';
import type Redis from 'ioredis';
import { UpdateTenantDto } from './dto/update-tenant.dto';

const TENANT_CACHE_TTL = 3600;

@Injectable()
export class TenantsService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async resolveTenantId(slug: string): Promise<string | null> {
    const cacheKey = `tenant:slug:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const [tenant] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug));

    if (!tenant) return null;

    await this.redis.set(cacheKey, tenant.id, 'EX', TENANT_CACHE_TTL);
    return tenant.id;
  }

  async findCurrent(tenantId: string) {
    const [tenant] = await this.db
      .select({
        id:      tenants.id,
        name:    tenants.name,
        slug:    tenants.slug,
        logoUrl: tenants.logoUrl,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    return tenant ?? null;
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    const patch: Partial<typeof tenants.$inferInsert> = {};
    if (dto.name    !== undefined) patch.name    = dto.name;
    if (dto.logoUrl !== undefined) patch.logoUrl = dto.logoUrl;

    const [updated] = await this.db
      .update(tenants)
      .set(patch)
      .where(eq(tenants.id, tenantId))
      .returning({
        id:      tenants.id,
        name:    tenants.name,
        slug:    tenants.slug,
        logoUrl: tenants.logoUrl,
      });

    return updated;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/tenants/
git commit -m "feat(api): add findCurrent and update to TenantsService"
```

---

## Task 2: Backend — TenantsController + Module

**Files:**
- Create: `packages/api/src/tenants/tenants.controller.ts`
- Modify: `packages/api/src/tenants/tenants.module.ts`

- [ ] **Step 1: Create the controller**

```ts
// packages/api/src/tenants/tenants.controller.ts
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('tenants')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles('tenant_admin')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Get('me')
  findCurrent(@TenantId() tenantId: string) {
    return this.service.findCurrent(tenantId);
  }

  @Patch('me')
  update(@TenantId() tenantId: string, @Body() dto: UpdateTenantDto) {
    return this.service.update(tenantId, dto);
  }
}
```

- [ ] **Step 2: Register controller in TenantsModule**

```ts
// packages/api/src/tenants/tenants.module.ts
import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
```

- [ ] **Step 3: Smoke-test the endpoints**

Start the API (`pnpm dev:api`) and verify with curl (replace `TOKEN` and `HOST`):

```bash
# GET /tenants/me
curl -H "Authorization: Bearer TOKEN" -H "x-tenant-slug: clinica-demo" \
  http://localhost:3001/tenants/me
# Expected: { "id": "...", "name": "Clínica Demo", "slug": "clinica-demo", "logoUrl": null }

# PATCH /tenants/me
curl -X PATCH \
  -H "Authorization: Bearer TOKEN" \
  -H "x-tenant-slug: clinica-demo" \
  -H "Content-Type: application/json" \
  -d '{"name":"Clínica Demo Editada"}' \
  http://localhost:3001/tenants/me
# Expected: { "id": "...", "name": "Clínica Demo Editada", ... }
```

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/tenants/
git commit -m "feat(api): expose GET/PATCH /tenants/me for tenant admins"
```

---

## Task 3: Frontend — env var + useTenantSettings hook

**Files:**
- Modify: `packages/web/.env`
- Create: `packages/web/src/hooks/useTenantSettings.ts`

- [ ] **Step 1: Add env var**

Append to `packages/web/.env`:

```
NEXT_PUBLIC_APP_NAME=Scheduler
```

- [ ] **Step 2: Create the hook**

```ts
// packages/web/src/hooks/useTenantSettings.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'

export type TenantSettings = {
  id:      string
  name:    string
  slug:    string
  logoUrl: string | null
}

export function useTenantSettings() {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<TenantSettings>({
    queryKey: ['tenant-settings', slug],
    queryFn:  async () => (await api('/tenants/me')).json(),
  })
}

export function useUpdateTenantSettings() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: { name?: string; logoUrl?: string | null }) =>
      api('/tenants/me', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', slug] }),
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/.env packages/web/src/hooks/useTenantSettings.ts
git commit -m "feat(web): add useTenantSettings hook and NEXT_PUBLIC_APP_NAME env"
```

---

## Task 4: Frontend — TenantSettingsProvider + layout wiring

**Files:**
- Create: `packages/web/src/providers/TenantSettingsProvider.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/layout.tsx`

- [ ] **Step 1: Create TenantSettingsProvider**

```tsx
// packages/web/src/providers/TenantSettingsProvider.tsx
'use client'

import { createContext, useContext, useEffect } from 'react'
import { useTenantSettings } from '@/hooks/useTenantSettings'
import { useAuth } from '@/providers/AuthProvider'

type TenantSettingsContextValue = {
  tenantName:    string
  tenantLogoUrl: string | null
}

const TenantSettingsContext = createContext<TenantSettingsContextValue>({
  tenantName:    '',
  tenantLogoUrl: null,
})

export function TenantSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'tenant_admin'

  const { data } = useTenantSettings()

  const tenantName    = data?.name    ?? ''
  const tenantLogoUrl = data?.logoUrl ?? null

  useEffect(() => {
    if (!tenantName) return
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Scheduler'
    document.title = `${tenantName} | ${appName}`
  }, [tenantName])

  return (
    <TenantSettingsContext.Provider value={{ tenantName, tenantLogoUrl }}>
      {children}
    </TenantSettingsContext.Provider>
  )
}

export function useTenantSettingsContext() {
  return useContext(TenantSettingsContext)
}
```

- [ ] **Step 2: Wrap (app) layout with TenantSettingsProvider**

```tsx
// packages/web/src/app/(tenant)/(app)/layout.tsx
import { AppShell } from '@/components/AppShell'
import { UserPreferencesProvider } from '@/providers/UserPreferencesProvider'
import { TenantSettingsProvider } from '@/providers/TenantSettingsProvider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantSettingsProvider>
      <UserPreferencesProvider>
        <AppShell>{children}</AppShell>
      </UserPreferencesProvider>
    </TenantSettingsProvider>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/providers/TenantSettingsProvider.tsx \
        packages/web/src/app/\(tenant\)/\(app\)/layout.tsx
git commit -m "feat(web): add TenantSettingsProvider with reactive title"
```

---

## Task 5: Frontend — AvatarCropField extensions + LogoCropField

**Files:**
- Modify: `packages/web/src/components/ui/AvatarCropField.tsx`
- Create: `packages/web/src/components/ui/LogoCropField.tsx`

- [ ] **Step 1: Extend AvatarCropField with `aspect`, `outputWidth`, `outputHeight`, `shape` props**

Replace the full file content:

```tsx
// packages/web/src/components/ui/AvatarCropField.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { cn } from '@/lib/utils'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']

function pickColor(str: string) {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number,
  outputHeight: number,
): Promise<string> {
  const image = new Image()
  image.src = imageSrc
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Image failed to load'))
  })

  const canvas = document.createElement('canvas')
  canvas.width  = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, outputWidth, outputHeight,
  )

  return canvas.toDataURL('image/jpeg', 0.9)
}

interface AvatarCropFieldProps {
  value:         string | null
  onChange:      (v: string | null) => void
  name?:         string
  aspect?:       number
  outputWidth?:  number
  outputHeight?: number
  shape?:        'circle' | 'rect'
}

export function AvatarCropField({
  value,
  onChange,
  name = '',
  aspect       = 1,
  outputWidth  = 256,
  outputHeight = 256,
  shape        = 'circle',
}: AvatarCropFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [cropError, setCropError] = useState(false)

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
    setCropError(false)
    try {
      const base64 = await getCroppedImg(imageSrc, croppedAreaPixels, outputWidth, outputHeight)
      onChange(base64)
      setModalOpen(false)
      setImageSrc(null)
    } catch {
      setCropError(true)
    }
  }

  function handleCancel() {
    setModalOpen(false)
    setImageSrc(null)
    setCropError(false)
  }

  const isRect = shape === 'rect'

  return (
    <>
      <div
        className="relative inline-block cursor-pointer group"
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <img
            src={value}
            alt="Imagem"
            className={cn(
              'object-cover',
              isRect ? 'h-10 w-auto max-w-[180px] rounded-lg' : 'w-20 h-20 rounded-full',
            )}
          />
        ) : isRect ? (
          <div className="h-10 w-[180px] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
            Clique para enviar logo
          </div>
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold select-none"
            style={{ background: name ? pickColor(name) : '#6366f1' }}
          >
            {name ? initials(name) : '?'}
          </div>
        )}

        <div className={cn(
          'absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity',
          isRect ? 'rounded-lg' : 'rounded-full',
        )}>
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
          <div className="bg-white rounded-xl shadow-xl w-[480px] overflow-hidden">
            <div className="relative h-[300px] bg-gray-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                cropShape={isRect ? 'rect' : 'round'}
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
            {cropError && (
              <p className="px-5 pb-2 text-xs text-red-500 m-0">Não foi possível processar a imagem. Tente outro arquivo.</p>
            )}
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button type="button" onClick={handleCancel}
                className="h-9 px-4 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleCrop}
                className="h-9 px-4 bg-indigo-500 text-white rounded-lg text-sm font-semibold cursor-pointer hover:bg-indigo-600 transition-colors">
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

- [ ] **Step 2: Create LogoCropField**

```tsx
// packages/web/src/components/ui/LogoCropField.tsx
import { AvatarCropField } from './AvatarCropField'

interface LogoCropFieldProps {
  value:    string | null
  onChange: (v: string | null) => void
}

export function LogoCropField({ value, onChange }: LogoCropFieldProps) {
  return (
    <AvatarCropField
      value={value}
      onChange={onChange}
      shape="rect"
      aspect={3}
      outputWidth={480}
      outputHeight={160}
    />
  )
}
```

- [ ] **Step 3: Verify existing avatar usages still work**

Verify that all existing usages of `AvatarCropField` pass the `name` prop as before. Search:

```bash
grep -rn "AvatarCropField" packages/web/src --include="*.tsx"
```

Expected matches: `ClientForm.tsx`, `ProfessionalForm.tsx`, `AdminForm.tsx`. All pass `name={...}` already — no changes needed in consumers.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/ui/AvatarCropField.tsx \
        packages/web/src/components/ui/LogoCropField.tsx
git commit -m "feat(web): extend AvatarCropField with aspect/shape/output props; add LogoCropField"
```

---

## Task 6: Frontend — Settings page + TenantGeneralForm

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx`
- Create: `packages/web/src/app/(tenant)/(app)/settings/general/page.tsx`

- [ ] **Step 1: Create TenantGeneralForm**

```tsx
// packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { LogoCropField } from '@/components/ui/LogoCropField'
import { useTenantSettings, useUpdateTenantSettings } from '@/hooks/useTenantSettings'
import { cn } from '@/lib/utils'

const inputCls = (disabled = false) => cn(
  'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none transition-colors',
  disabled
    ? 'opacity-60 cursor-not-allowed bg-gray-50'
    : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
)

export function TenantGeneralForm() {
  const { data, isLoading } = useTenantSettings()
  const { mutateAsync, isPending } = useUpdateTenantSettings()

  const [name,     setName]     = useState('')
  const [logoUrl,  setLogoUrl]  = useState<string | null>(null)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  useEffect(() => {
    if (!data) return
    setName(data.name)
    setLogoUrl(data.logoUrl)
  }, [data])

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>

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

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── Logo ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Logo</p>
        <p className="text-[13px] text-gray-500 m-0 mb-4">
          Aparece no topo do menu lateral. Proporção 3:1 (horizontal).
        </p>
        <LogoCropField value={logoUrl} onChange={setLogoUrl} />
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
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Informações</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tenant-name" className="block text-[13px] font-medium text-gray-700 mb-1.5">
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
            <label htmlFor="tenant-slug" className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Host (slug)
            </label>
            <input
              id="tenant-slug"
              type="text"
              value={data?.slug ?? ''}
              disabled
              className={inputCls(true)}
            />
            <p className="text-[11px] text-gray-400 mt-1 m-0">O host não pode ser alterado.</p>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      {error && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[13px] text-emerald-700">
          Alterações salvas com sucesso.
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Salvando...
            </>
          ) : 'Salvar alterações'}
        </button>
      </div>

    </form>
  )
}
```

- [ ] **Step 2: Create the settings/general page**

```tsx
// packages/web/src/app/(tenant)/(app)/settings/general/page.tsx
'use client'

import { useAuth } from '@/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { TenantGeneralForm } from '../_components/TenantGeneralForm'

export default function SettingsGeneralPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== 'tenant_admin') router.replace('/appointments')
  }, [user, router])

  if (!user || user.role !== 'tenant_admin') return null

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-lg font-bold text-gray-900 m-0">Gerais</h1>
        <p className="text-[13px] text-gray-500 mt-1 m-0">Configurações gerais do sistema.</p>
      </div>
      <TenantGeneralForm />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/\(tenant\)/\(app\)/settings/
git commit -m "feat(web): add settings/general page with TenantGeneralForm"
```

---

## Task 7: Frontend — Sidebar updates

**Files:**
- Modify: `packages/web/src/components/AppShell/Sidebar.tsx`

- [ ] **Step 1: Replace Sidebar.tsx entirely**

```tsx
// packages/web/src/components/AppShell/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTenant } from '@/providers/TenantProvider'
import { useAuth } from '@/providers/AuthProvider'
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
import { cn } from '@/lib/utils'

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="12"/>
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-2-8 2v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

type NavItem = {
  label: string
  href:  string
  icon:  React.ReactNode
  roles: Array<'tenant_admin' | 'professional' | 'client'>
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Agendamentos',   href: '/appointments',  icon: <CalendarIcon />,  roles: ['tenant_admin', 'professional', 'client'] },
  { label: 'Clientes',       href: '/clients',       icon: <UsersIcon />,     roles: ['tenant_admin', 'professional'] },
  { label: 'Profissionais',  href: '/professionals', icon: <BriefcaseIcon />, roles: ['tenant_admin'] },
  { label: 'Administradores',href: '/admins',        icon: <ShieldIcon />,    roles: ['tenant_admin'] },
]

const SETTINGS_ITEMS: NavItem[] = [
  { label: 'Gerais', href: '/settings/general', icon: <SettingsIcon />, roles: ['tenant_admin'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { slug } = useTenant()
  const { user } = useAuth()
  const { tenantName, tenantLogoUrl } = useTenantSettingsContext()

  const role = user?.role
  const items = NAV_ITEMS.filter(item => role && item.roles.includes(role))
  const settingsItems = SETTINGS_ITEMS.filter(item => role && item.roles.includes(role))

  return (
    <aside className="w-[260px] min-h-screen bg-slate-900 fixed left-0 top-0 bottom-0 flex flex-col z-40 border-r border-white/[0.05]">

      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          {tenantLogoUrl ? (
            <img
              src={tenantLogoUrl}
              alt={tenantName}
              className="h-9 w-auto max-w-full object-contain"
            />
          ) : (
            <>
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="16" rx="2" stroke="white" strokeWidth="2"/>
                  <path d="M8 9h8M8 13h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-[15px] font-bold text-slate-100 tracking-[-0.01em]">
                {tenantName || 'Scheduler'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 pt-4 flex-1">
        <p className="text-[10px] font-semibold text-slate-500 tracking-[0.08em] uppercase px-3 mb-2">
          Menu
        </p>
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13.5px] font-medium mb-0.5 no-underline transition-colors',
                active
                  ? 'bg-indigo-500/[0.18] text-indigo-300'
                  : 'text-slate-400 hover:bg-white/[0.07] hover:text-slate-100'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}

        {settingsItems.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-slate-500 tracking-[0.08em] uppercase px-3 mb-2 mt-5">
              Configurações
            </p>
            {settingsItems.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13.5px] font-medium mb-0.5 no-underline transition-colors',
                    active
                      ? 'bg-indigo-500/[0.18] text-indigo-300'
                      : 'text-slate-400 hover:bg-white/[0.07] hover:text-slate-100'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.07] text-[11px] text-slate-500 text-center">
        {slug}
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/AppShell/Sidebar.tsx
git commit -m "feat(web): update Sidebar with logo, reactive tenant name, and settings nav"
```

---

## Task 8: Header breadcrumb — add settings route

**Files:**
- Modify: `packages/web/src/components/AppShell/Header.tsx`

- [ ] **Step 1: Add `/settings/general` to STATIC breadcrumb map**

In `Header.tsx`, find the `STATIC` object inside `getBreadcrumbs` and add:

```ts
'/settings/general': [{ label: 'Configurações' }, { label: 'Gerais' }],
```

Full updated `STATIC` object:

```ts
const STATIC: Record<string, Crumb[]> = {
  '/appointments':        [{ label: 'Agendamentos' }],
  '/appointments/create': [{ label: 'Agendamentos', href: '/appointments' }, { label: 'Novo agendamento' }],
  '/clients':             [{ label: 'Clientes' }],
  '/clients/new':         [{ label: 'Clientes', href: '/clients' }, { label: 'Novo cliente' }],
  '/professionals':       [{ label: 'Profissionais' }],
  '/professionals/new':   [{ label: 'Profissionais', href: '/professionals' }, { label: 'Novo profissional' }],
  '/professionals/me':    [{ label: 'Meu perfil' }],
  '/me':                  [{ label: 'Meu perfil' }],
  '/settings/general':    [{ label: 'Configurações' }, { label: 'Gerais' }],
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/AppShell/Header.tsx
git commit -m "feat(web): add settings/general breadcrumb to Header"
```

---

## Self-Review Checklist

- [x] **GET /tenants/me** → Task 1 (service) + Task 2 (controller)
- [x] **PATCH /tenants/me** → Task 1 (service) + Task 2 (controller)
- [x] **Campo Host desabilitado** → Task 6, `TenantGeneralForm`, input com `disabled`
- [x] **Logo crop retangular 3:1** → Task 5, `AvatarCropField` com `aspect={3}` + `LogoCropField`
- [x] **Logo no topo do sidebar** → Task 7, `Sidebar` lê `tenantLogoUrl` do context
- [x] **Sem logo: ícone + tenantName** → Task 7, branch `tenantLogoUrl ? img : icon+name`
- [x] **NEXT_PUBLIC_APP_NAME** → Task 3, `.env`
- [x] **Título: `{tenantName} | Scheduler`** → Task 4, `TenantSettingsProvider` useEffect
- [x] **Atualização imediata ao salvar** → TanStack Query `invalidateQueries` em `useUpdateTenantSettings`, provider re-renderiza
- [x] **Seção "Configurações" no sidebar** → Task 7, `SETTINGS_ITEMS` + section label
- [x] **Item "Gerais" admin-only** → Task 7, `roles: ['tenant_admin']`
- [x] **Breadcrumb do Header** → Task 8
- [x] **Tipos consistentes:** `TenantSettings` definido em Task 3 e usado em Tasks 4 e 6
