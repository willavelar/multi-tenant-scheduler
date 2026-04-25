# Design: Formulário Compartilhado de Profissionais

**Data:** 2026-04-20  
**Escopo:** módulo de profissionais no frontend (`packages/web`)

---

## Problema

As páginas de criação (`/professionals/new`) e edição (`/professionals/[id]/edit`) duplicam o formulário de profissional. Cada uma tem sua própria implementação de campos, validação e estado. Qualquer mudança no formulário precisa ser feita em dois lugares.

Diferenças adicionais problemáticas:
- Criação usa React Hook Form + Zod; edição usa `useState` puro
- Edição não tem validação inline; criação sim
- Layout diverge entre as duas páginas

---

## Solução

Extrair um componente `ProfessionalForm` colocado em `professionals/_components/`. As páginas de criação e edição continuam como rotas separadas, mas ambas delegam o formulário para esse componente.

---

## Estrutura de Arquivos

```
app/(tenant)/(app)/professionals/
  _components/
    ProfessionalForm.tsx        ← novo
  new/
    page.tsx                    ← simplificado
  [id]/
    page.tsx                    ← sem mudança
    edit/
      page.tsx                  ← simplificado
  me/
    page.tsx                    ← sem mudança
  page.tsx                      ← sem mudança
```

---

## Componente `ProfessionalForm`

### Interface

```ts
type ProfessionalFormData = {
  // create + edit
  name:      string
  position?: string
  bio?:      string
  avatarUrl?: string | null
  // create only
  email?:    string
  password?: string
  // edit only
  active?:   boolean
}

type ProfessionalFormProps = {
  mode:          'create' | 'edit'
  defaultValues?: Partial<ProfessionalFormData>
  onSubmit:      (data: ProfessionalFormData) => Promise<void>
  isAdmin?:      boolean        // controla visibilidade do campo Status
  isOwnProfile?: boolean        // impede admin de editar próprio status
}
```

### Schemas Zod

```ts
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
```

O schema ativo é selecionado dentro do componente com base em `mode`.

---

## Layout do Formulário

Dois cards para ambos os modos:

**Card 1 — Dados pessoais**
- `AvatarCropField`
- Grid 2 colunas: Nome completo | Cargo
- (Apenas em `create`) abaixo do grid: E-mail | Senha inicial (full-width, empilhados)

**Card 2 — Perfil**
- Textarea Observações
- (Apenas em `edit`, quando `isAdmin && !isOwnProfile`) Select Status (Ativo/Inativo)

**Footer (fora dos cards)**
- Botão submit (`"Cadastrar profissional"` / `"Salvar alterações"`) com spinner durante submissão
- (Apenas em `edit`) Botão Cancelar secundário
- Bloco de erro de API quando `errors.root` está presente

---

## Validação

React Hook Form + Zod em ambos os modos.  
Erros aparecem inline abaixo de cada campo (`text-xs text-red-500`).  
Erros de API aparecem no bloco root antes do botão de submit.

---

## Páginas Simplificadas

### `new/page.tsx`

```tsx
export default function NewProfessionalPage() {
  const router = useRouter()
  const { mutateAsync } = useCreateProfessional()

  return (
    <div className="max-w-[560px]">
      <BackButton href="/professionals">Voltar para profissionais</BackButton>
      <ProfessionalForm
        mode="create"
        onSubmit={async (data) => {
          await mutateAsync(data)
          router.push('/professionals')
        }}
      />
    </div>
  )
}
```

### `[id]/edit/page.tsx`

```tsx
export default function EditProfessionalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me, updateUser } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: prof, isLoading } = useProfessional(id)
  const isOwnProfile = !!prof && prof.userId === me?.id
  const { mutateAsync } = useUpdateProfessional(id)

  if (isLoading || !prof) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>

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
        onSubmit={async (data) => {
          await mutateAsync(data)
          if (isOwnProfile) updateUser({ name: data.name, avatarUrl: data.avatarUrl ?? null })
          router.push(`/professionals/${id}`)
        }}
      />
    </div>
  )
}
```

---

## O que não muda

- Rotas (`/professionals/new`, `/professionals/[id]/edit`) — sem alteração
- `useProfessionals.ts` — sem alteração
- Página de detalhe `[id]/page.tsx` — sem alteração
- `AvatarCropField` — consumido pelo `ProfessionalForm` como hoje

---

## Critérios de sucesso

- Criar profissional funciona igual ao atual
- Editar profissional ganha validação inline (comportamento novo)
- Alterar um campo no `ProfessionalForm` reflete em criação e edição automaticamente
- Admin vê campo Status em edição; profissional editando o próprio perfil não vê
