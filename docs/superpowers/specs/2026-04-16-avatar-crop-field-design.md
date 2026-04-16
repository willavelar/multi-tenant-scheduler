# Avatar Crop Field — Design Spec

**Data:** 2026-04-16

## Objetivo

Adicionar um campo de avatar editável com recorte quadrado nos formulários de criação e edição de profissionais e clientes. A imagem é sempre exportada em 256×256px como JPEG base64 e armazenada no campo `avatarUrl` de cada entidade.

---

## Componente: `AvatarCropField`

**Arquivo:** `packages/web/src/components/ui/AvatarCropField.tsx`

### Props

```typescript
interface AvatarCropFieldProps {
  value: string | null       // avatarUrl atual (base64 ou URL)
  onChange: (v: string | null) => void
  name: string               // usado para gerar iniciais no fallback
}
```

### Comportamento

1. Renderiza um avatar circular de 80px:
   - Se `value` → exibe a imagem
   - Se não → exibe iniciais + cor determinística (mesmo `pickColor` já usado no projeto)
2. Ícone de câmera sobreposto indica que é clicável
3. Clique → `<input type="file" accept="image/*">` (hidden) é acionado
4. Arquivo selecionado → lê com `FileReader` → abre **modal de recorte**
5. Modal:
   - Usa `react-easy-crop` com `aspect={1}` (sempre quadrado)
   - Suporta zoom via scroll
   - Botão "Recortar" → extrai área com canvas nativo → exporta 256×256 JPEG → `onChange(base64)`
   - Botão "Cancelar" → fecha sem alterar o valor
6. Ao chamar `onChange(null)` (futuro: botão "remover") → limpa o avatar

### Dependência

```bash
pnpm --filter web add react-easy-crop
```

`react-easy-crop` retorna `{ x, y, width, height }` relativo à imagem natural. O canvas copia exatamente essa área e redimensiona para 256×256.

---

## Mudanças de Schema — Clientes

`avatarUrl` não existe em `client_profiles`. Adicionar:

```typescript
// packages/shared/src/schema/client-profiles.schema.ts
avatarUrl: text('avatar_url'),
```

Após adicionar:
```bash
pnpm db:generate   # gera SQL migration
pnpm db:migrate    # aplica no banco
```

---

## Mudanças de API — Clientes

**`clients.service.ts`:**
- Adicionar `avatarUrl: clientProfiles.avatarUrl` ao objeto `FIELDS` nos métodos `findAll` e `findOne`
- Incluir `avatarUrl` no insert de `create` e no patch de `update`

---

## Mudanças de Tipo e Hook — Clientes

**`types/index.ts`:** adicionar `avatarUrl: string | null` em `Client`

**`useClients.ts`:** adicionar `avatarUrl?: string` no body de `useCreateClient` e `useUpdateClient`

---

## Profissionais

`avatarUrl` já existe em schema, API (`PROF_FIELDS`), tipo (`Professional`) e hooks (`useCreateProfessional`, `useUpdateProfessional`). Nenhuma mudança de backend necessária.

---

## Integração nos Formulários

### Formulário de criação de profissional (`professionals/new/page.tsx`)
- Adicionar estado `avatarUrl: string | null`
- Renderizar `<AvatarCropField value={avatarUrl} onChange={setAvatarUrl} name={form.name} />` no topo do card "Dados pessoais"
- Incluir `avatarUrl` no body do `create.mutateAsync`

### Formulário de edição de profissional (`professionals/[id]/edit/page.tsx`)
- Mesma adição; inicializar com `prof.avatarUrl ?? null` no `useEffect`

### Formulário de criação de cliente (`clients/new/page.tsx`)
- Mesma adição

### Formulário de edição de cliente (`clients/[id]/edit/page.tsx`)
- Mesma adição; inicializar com `client.avatarUrl ?? null`

---

## Fora do Escopo

- Upload para storage externo (S3, CDN)
- Botão "remover avatar" (apenas substituir por nova imagem)
- Crop em formatos além de JPEG
- Validação de tamanho máximo de arquivo (base64 de 256×256 JPEG é ~15-30KB)
