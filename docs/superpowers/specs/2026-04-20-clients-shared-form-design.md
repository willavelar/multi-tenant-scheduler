# Design: Formulário Compartilhado de Clientes

**Data:** 2026-04-20  
**Escopo:** módulo de clientes no frontend (`packages/web`)

---

## Problema

As páginas de criação (`/clients/new`) e edição (`/clients/[id]/edit`) duplicam ~200 linhas de JSX e lógica de formulário. Qualquer mudança (campo novo, validação, layout) precisa ser aplicada em dois lugares.

Problemas adicionais:
- `applyPhoneMask` está copiada nos dois arquivos
- Estado de profissionais/serviços duplicado
- Lógica de validação duplicada

---

## Solução

Extrair um componente `ClientForm` em `clients/_components/`. As páginas continuam como rotas separadas mas delegam o formulário para esse componente único.

---

## Estrutura de Arquivos

```
app/(tenant)/(app)/clients/
  _components/
    ClientForm.tsx        ← novo
  new/
    page.tsx              ← simplificado
  [id]/
    page.tsx              ← sem mudança
    edit/
      page.tsx            ← simplificado
  page.tsx                ← sem mudança
```

---

## Componente `ClientForm`

### Interface

```ts
// Dados que o ClientForm entrega ao onSubmit (já montados, prontos para a API)
export type ClientFormData = {
  name: string
  email: string
  password?: string                          // presente apenas em create
  phone?: string                             // dígitos sem máscara, undefined se vazio
  birthDate?: string                         // ISO date ou undefined
  notes?: string                             // undefined se vazio
  active: boolean
  avatarUrl?: string                         // undefined se não alterado/ausente
  allProfessionals: boolean
  allServices: boolean
  professionalIds: string[]                  // vazio quando allProfessionals = true
  serviceIds: string[]                       // vazio quando allServices = true
  serviceLimitCount?: number                 // undefined se não preenchido
  serviceLimitPeriod?: 'day' | 'week' | 'month'
}

export type ClientFormProps = {
  mode:           'create' | 'edit'
  defaultValues?: ClientDetail               // passado pelo edit/page após fetch
  onSubmit:       (data: ClientFormData) => Promise<void>
  onCancel:       () => void
  isOwnProfile?:  boolean                    // oculta campo Status em edit
}
```

`ClientDetail` vem de `@/types` (já existente): `Client & { linkedProfessionals, linkedServices }`.

### Estado interno

```ts
// Campos de texto/select simples
const [form, setForm] = useState<FormState>({
  name, email, password, phone, birthDate, notes, active,
  serviceLimitCount, serviceLimitPeriod,
})
const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'root', string>>>({})

// Profissionais
const [allProfs, setAllProfs]         = useState(true)
const [selectedProfs, setSelectedProfs] = useState<Professional[]>([])
const [profSearch, setProfSearch]     = useState('')
const [showProfDrop, setShowProfDrop] = useState(false)
const profRef = useRef<HTMLDivElement>(null)

// Serviços
const [allSvcs, setAllSvcs]               = useState(true)
const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

// Controle de inicialização (apenas edit aguarda defaultValues + allProfessionals)
const [initialized, setInitialized] = useState(mode === 'create')
```

Dados externos (ambos os modos precisam):
```ts
const { data: allProfessionals = [] } = useProfessionals()
const { data: allServices = [] }      = useServices()
```

### Inicialização em edit

```ts
useEffect(() => {
  if (mode !== 'edit' || !defaultValues || initialized || allProfessionals.length === 0) return
  setForm({
    name:               defaultValues.name,
    email:              defaultValues.email,
    password:           '',
    phone:              applyPhoneMask(defaultValues.phone ?? ''),
    birthDate:          defaultValues.birthDate ?? '',
    notes:              defaultValues.notes ?? '',
    active:             defaultValues.active !== false,
    serviceLimitCount:  defaultValues.serviceLimitCount != null
                          ? String(defaultValues.serviceLimitCount) : '',
    serviceLimitPeriod: defaultValues.serviceLimitPeriod ?? '',
  })
  setAvatarUrl(defaultValues.avatarUrl ?? null)
  setAllProfs(defaultValues.allProfessionals === true)
  setAllSvcs(defaultValues.allServices === true)
  setSelectedProfs(
    defaultValues.linkedProfessionals
      .map(lp => allProfessionals.find(p => p.id === lp.professionalId))
      .filter(Boolean) as Professional[]
  )
  setSelectedServiceIds(defaultValues.linkedServices.map(s => s.serviceId))
  setInitialized(true)
}, [mode, defaultValues, allProfessionals, initialized])

if (!initialized) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
```

### `applyPhoneMask`

Extraída para dentro de `ClientForm.tsx` (não duplicada). Mesma implementação atual.

### Layout — cinco cards

**Card 1 — Dados pessoais**
- `AvatarCropField`
- Grid 2 colunas: Nome\*, Email\*, [Senha\* apenas create], Telefone
- Data de nascimento (`DatePickerField`, max-w-[220px])

**Card 2 — Perfil**
- Textarea Observações
- Select Status (Ativo/Inativo) — em `edit`, oculto quando `isOwnProfile`

**Card 3 — Limite de serviços**
- Input Quantidade (number) + Select Período (Dia/Semana/Mês) + botão "Remover limite"

**Card 4 — Profissionais vinculados**
- Checkbox "Todos os profissionais"
- Quando desmarcado: search input + dropdown + pills dos selecionados

**Card 5 — Serviços permitidos** (só renderiza se `allServices.length > 0`)
- Checkbox "Todos os serviços"
- Quando desmarcado: lista de checkboxes por serviço

**Footer (fora dos cards)**
- Botão submit com spinner: `"Cadastrar cliente"` (create) / `"Salvar alterações"` (edit)
- Botão Cancelar (ambos os modos)
- Bloco de erro root

### Montagem do payload em `handleSubmit`

O `ClientForm` monta `ClientFormData` internamente antes de chamar `onSubmit`:

```ts
async function handleSubmit(ev: React.FormEvent) {
  ev.preventDefault()
  if (!validate()) return
  try {
    const data: ClientFormData = {
      name:             form.name.trim(),
      email:            form.email.trim(),
      ...(mode === 'create' ? { password: form.password } : {}),
      phone:            form.phone.trim() || undefined,
      birthDate:        form.birthDate || undefined,
      notes:            form.notes.trim() || undefined,
      active:           form.active,
      avatarUrl:        avatarUrl ?? undefined,
      allProfessionals: allProfs,
      allServices:      allSvcs,
      professionalIds:  allProfs ? [] : selectedProfs.map(p => p.id),
      serviceIds:       allSvcs ? [] : selectedServiceIds,
      ...(form.serviceLimitCount
        ? {
            serviceLimitCount:  Number(form.serviceLimitCount),
            serviceLimitPeriod: form.serviceLimitPeriod as 'day' | 'week' | 'month',
          }
        : {}),
    }
    await onSubmit(data)
  } catch {
    setErrors(e => ({ ...e, root: mode === 'create'
      ? 'Não foi possível cadastrar o cliente. Verifique os dados e tente novamente.'
      : 'Não foi possível salvar as alterações. Verifique os dados e tente novamente.',
    }))
  }
}
```

---

## Páginas Simplificadas

### `new/page.tsx`

```tsx
export default function NewClientPage() {
  const router = useRouter()
  const { mutateAsync } = useCreateClient()

  return (
    <div>
      <BackButton href="/clients" variant="ghost">Voltar para clientes</BackButton>
      <ClientForm
        mode="create"
        onSubmit={async (data) => {
          await mutateAsync(data)
          router.push('/clients')
        }}
        onCancel={() => router.push('/clients')}
      />
    </div>
  )
}
```

### `[id]/edit/page.tsx`

```tsx
export default function EditClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me, updateUser } = useAuth()
  const isOwnProfile = id === me?.id

  const { data: client, isLoading } = useClient(id)
  const { mutateAsync } = useUpdateClient(id)

  if (isLoading || !client) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>

  return (
    <div>
      <div className="mb-7">
        <BackButton href={`/clients/${id}`}>Voltar para cliente</BackButton>
      </div>
      <ClientForm
        mode="edit"
        defaultValues={client}
        isOwnProfile={isOwnProfile}
        onSubmit={async (data) => {
          await mutateAsync({
            ...data,
            ...(mode === 'edit' && !data.serviceLimitCount
              ? { serviceLimitCount: null, serviceLimitPeriod: null }
              : {}),
          })
          if (isOwnProfile) updateUser({ name: data.name, avatarUrl: data.avatarUrl ?? null })
          router.push(`/clients/${id}`)
        }}
        onCancel={() => router.push(`/clients/${id}`)}
      />
    </div>
  )
}
```

**Nota:** o edit/page precisa enviar `serviceLimitCount: null` quando o campo foi limpo (diferente do create que simplesmente omite). Isso é tratado no `onSubmit` da página.

---

## O que não muda

- Rotas — sem alteração
- `useClients.ts` — sem alteração
- Página de detalhe `[id]/page.tsx` — sem alteração
- Página de lista `page.tsx` — sem alteração

---

## Critérios de sucesso

- Criar cliente funciona igual ao atual
- Editar cliente funciona igual ao atual (inicialização com dados existentes)
- Profissional editando próprio perfil não vê campo Status
- `applyPhoneMask` existe em apenas um lugar
- Alterar um campo/validação no `ClientForm` reflete em criação e edição automaticamente
