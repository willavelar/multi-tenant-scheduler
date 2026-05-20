# Spec — Conformidade com Next.js Best Practices

> Auditoria contra `rules/nextjs-best-practices.md`.  
> Data: 2025-05-19

---

## Resultado da auditoria

A maioria das regras está correta. O projeto segue bem:
- App Router com Server Components como default onde possível dado o modelo de auth
- `"use client"` empurrado para as folhas (providers, hooks de domínio, componentes interativos)
- 14 custom hooks extraídos corretamente separando lógica de renderização
- TanStack Query com `queryKey` incluindo `slug` (previne contaminação de cache entre tenants)
- Middleware correto para roteamento por subdomínio
- TypeScript strict + Zod em todos os formulários
- Variáveis de ambiente com prefixo `NEXT_PUBLIC_` correto

**Violação encontrada**: **Regra 7 — Otimização de Imagens**

---

## Problema raiz: imagens armazenadas como base64 no banco

Antes de detalhar a correção, é necessário entender por que o problema existe.

A arquitetura atual armazena avatares e logos diretamente como **data URLs base64** na coluna `text` do PostgreSQL:

```ts
// packages/api/src/clients/dto/update-client.dto.ts
@IsOptional() @IsString() @MaxLength(200_000) avatarUrl?: string;

// packages/shared/src/schema/users.schema.ts
avatarUrl: text('avatar_url'),
```

`@MaxLength(200_000)` é o sinal: uma URL HTTP tem <2 KB; um JPEG 256×256 em base64 ocupa ~50 KB.

O componente `AvatarCropField` confirma: produz `canvas.toDataURL('image/jpeg', 0.9)` e envia esse string diretamente para a API.

**Consequências desta arquitetura:**
1. `next/image` **não suporta `data:` URLs** — só aceita URLs HTTP/HTTPS ou paths relativos.
2. Payloads de API inflados (cada resposta carrega a imagem embutida).
3. Banco de dados crescendo com blobs de imagem em texto.
4. Sem cache HTTP, CDN ou lazy loading real possível.

---

## Mudanças necessárias

### Fase 1 — Migração de armazenamento de imagens (backend)

**Objetivo**: Migrar de base64-no-banco para armazenamento em serviço de arquivos (S3, Cloudflare R2, etc.) com apenas a URL persistida.

**Escopo de mudanças no `packages/api/`:**

#### 1.1 Criar módulo de upload de arquivos

```
api/src/
  uploads/
    uploads.module.ts
    uploads.service.ts          ← integração com S3/R2 via SDK
    uploads.controller.ts       ← POST /uploads/avatar, POST /uploads/logo
```

O controller recebe `multipart/form-data`, faz upload para o storage, retorna a URL pública.

```ts
// uploads.controller.ts (esboço)
@Post('avatar')
@UseInterceptors(FileInterceptor('file'))
async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
  const url = await this.uploadsService.upload(file, 'avatars')
  return { url }
}
```

#### 1.2 Ajustar DTOs — remover `@MaxLength(200_000)`

Nos seguintes arquivos, `avatarUrl` passa a ser uma URL HTTP real:

| Arquivo | Campo |
|---|---|
| `api/src/admins/dto/create-admin.dto.ts` | `avatarUrl` |
| `api/src/admins/dto/update-admin.dto.ts` | `avatarUrl` |
| `api/src/professionals/dto/create-professional.dto.ts` | `avatarUrl` |
| `api/src/professionals/dto/update-professional.dto.ts` | `avatarUrl` |
| `api/src/clients/dto/create-client.dto.ts` | `avatarUrl` |
| `api/src/clients/dto/update-client.dto.ts` | `avatarUrl` |
| `api/src/tenants/dto/update-tenant.dto.ts` | `logoUrl`, `logoDarkUrl` |

Trocar `@MaxLength(200_000)` por `@IsUrl()`:

```ts
// antes
@IsOptional() @IsString() @MaxLength(200_000) avatarUrl?: string;

// depois
@IsOptional() @IsUrl() avatarUrl?: string;
```

#### 1.3 Migração de dados

Escrever script de migração que:
1. Lê todos os registros com `avatarUrl` começando em `data:`
2. Decodifica o base64
3. Faz upload para o storage
4. Atualiza o registro com a URL resultante

> **Importante**: executar antes de alterar os DTOs em produção.

---

### Fase 2 — Ajustes no frontend (`packages/web/`)

#### 2.1 `AvatarCropField` — manter `<img>` na preview, mudar o fluxo de submit

O componente produz base64 localmente para exibir a preview do crop. Isso é correto e deve ser mantido — `next/image` não serve aqui pois é uma URL de objeto temporária.

A mudança é no **fluxo de submit do formulário**: em vez de enviar o base64 no campo `avatarUrl`, fazer um upload antes e enviar a URL:

```ts
// Padrão atual (❌)
await updateProfessional({ avatarUrl: cropResult }) // base64 grande no body

// Padrão alvo (✅)
const { url } = await uploadAvatar(cropResult)     // upload separado
await updateProfessional({ avatarUrl: url })        // URL pequena no body
```

Criar hook `useUploadAvatar` em `src/hooks/useUploadAvatar.ts`:

```ts
export function useUploadAvatar() {
  const api = useApi()
  return useMutation({
    mutationFn: async (base64: string) => {
      const blob = await fetch(base64).then(r => r.blob())
      const form = new FormData()
      form.append('file', blob, 'avatar.jpg')
      const res = await api('/uploads/avatar', { method: 'POST', body: form })
      return res.json() as Promise<{ url: string }>
    },
  })
}
```

Formulários afetados (onde `AvatarCropField` é usado):
- `professionals/new/page.tsx` e `professionals/[id]/edit/page.tsx`
- `admins/new/page.tsx` e `admins/[id]/edit/page.tsx`
- `clients/new/page.tsx` e `clients/[id]/edit/page.tsx`
- `settings/general/page.tsx` (logo do tenant)

#### 2.2 Configurar `remotePatterns` no `next.config.ts`

```ts
// packages/web/next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['clinica-demo.lvh.me', '*.lvh.me'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',  // ajustar para o provider escolhido
      },
      // ou para S3:
      // { protocol: 'https', hostname: '**.amazonaws.com' }
    ],
  },
}

export default nextConfig
```

#### 2.3 Substituir `<img>` por `next/image`

Após a migração de dados, os `avatarUrl` serão URLs HTTP reais. Substituir em:

| Arquivo | Dimensão atual | `next/image` equivalente |
|---|---|---|
| `AppShell/Header.tsx:123` | `w-8.5 h-8.5` (≈34px) | `width={34} height={34}` |
| `AppShell/Sidebar.tsx:106` | `h-9 w-auto` (logo) | `fill` + container relativo |
| `components/ui/AvatarName.tsx:26` | prop `size` dinâmico | `width={size} height={size}` |
| `admins/_components/AdminDetailView.tsx:43` | `w-14 h-14` (56px) | `width={56} height={56}` |
| `clients/_components/ClientDetailView.tsx:66` | `w-14 h-14` (56px) | `width={56} height={56}` |
| `professionals/_components/ProfessionalDetailView.tsx:56` | `w-14 h-14` (56px) | `width={56} height={56}` |
| `appointments/_components/AppointmentPopover.tsx:99` | `w-7 h-7` (28px) | `width={28} height={28}` |
| `appointments/_components/AppointmentPopover.tsx:125` | `w-4 h-4` (16px) | `width={16} height={16}` |
| `appointments/create/page.tsx:299` | `w-9 h-9` (36px) | `width={36} height={36}` |

**Exceção permanente**: `AvatarCropField.tsx:121` — preview de base64 local. Manter `<img>`.

Exemplo de conversão:

```tsx
// ❌ antes
<img src={admin.avatarUrl} alt={admin.name} className="w-14 h-14 rounded-full object-cover shrink-0" />

// ✅ depois
import Image from 'next/image'

<Image
  src={admin.avatarUrl}
  alt={admin.name}
  width={56}
  height={56}
  className="rounded-full object-cover shrink-0"
/>
```

**Caso especial — logo do sidebar** (dimensão variável):

```tsx
// ❌ antes
<img src={logoUrl} alt={tenantName} className="h-9 w-auto max-w-full object-contain" />

// ✅ depois (container relativo + fill)
<div className="relative h-9 w-32">
  <Image src={logoUrl} alt={tenantName} fill className="object-contain object-left" />
</div>
```

**Caso especial — AvatarName** (tamanho dinâmico via prop):

```tsx
// ❌ antes
<img src={avatarUrl} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />

// ✅ depois
<Image src={avatarUrl} alt={name} width={size} height={size} className="rounded-full object-cover shrink-0" />
```

---

## Sequência de execução

```
1. Escolher storage service (S3, Cloudflare R2, etc.)
2. Criar módulo uploads no API (Fase 1.1)
3. Escrever e executar script de migração de dados (Fase 1.3)
4. Atualizar DTOs para @IsUrl() (Fase 1.2)
5. Criar useUploadAvatar hook (Fase 2.1)
6. Refatorar formulários para upload-then-save (Fase 2.1)
7. Configurar remotePatterns no next.config.ts (Fase 2.2)
8. Substituir <img> por next/image (Fase 2.3)
9. Verificar: pnpm dev:web + testar upload e exibição de avatares
```

---

## O que NÃO precisa mudar

- Toda a lógica de TanStack Query — correta para este modelo de auth
- Uso de `"use client"` — adequado dado que toda a UI é autenticada via JWT no browser
- Custom hooks — bem extraídos, separação clara entre domínio e UI
- Middleware de subdomínio — implementação correta
- `AvatarCropField` — a lógica de crop local em base64 é correta; só o fluxo de envio muda
- `loading.tsx`/`error.tsx` — desnecessários aqui; estados de loading/error são gerenciados pelo TanStack Query dentro dos Client Components
