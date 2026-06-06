# Next.js — Regras para Novos Componentes

Checklist e regras a seguir **sempre que for criar um novo componente** neste projeto.
Esta é a **fonte única** das regras de componentes (onde colocar o arquivo, nomenclatura, Server vs Client Components, custom hooks, DRY/extração).

---

## 0. Onde o componente mora + nomenclatura

> **Decida isto ANTES de escrever o componente.** Errar a pasta gera retrabalho e a confusão de "o que é shadcn e o que é nosso?".

### 0.1 A regra de ouro do `components/ui/`

**`components/ui/` é território exclusivo do shadcn/ui.** Só entram ali os primitivos gerados pela CLI (`npx shadcn@latest add ...`). Nada de componente nosso nessa pasta.

Por quê: a pasta `ui/` é o destino do alias `aliases.ui` em `components.json` — a CLI do shadcn escreve, atualiza e faz `diff` dos arquivos **pelo nome** lá dentro. Misturar componente custom quebra o fluxo de upgrade (`npx shadcn diff`) e apaga o limite entre "código vendored" e "código nosso".

| Pergunta | Resposta |
|---|---|
| Veio de `npx shadcn add`? (importa de `@base-ui/...`/`@radix-ui/...`, usa `data-slot`, aspas duplas) | → `components/ui/`, **nome lowercase**, **não renomear** |
| É nosso (lógica/composição/domínio do projeto)? | → pasta de **categoria** (ver 0.3), **nome PascalCase** |

Primitivos shadcn atuais em `ui/`: `avatar`, `badge`, `button`, `calendar`, `card`, `dialog`, `form`, `input`, `label`, `select`, `separator`, `sheet`, `skeleton`, `table`, `tabs`.

> Estendeu um primitivo shadcn (ex: adicionou uma prop `size`)? Tudo bem mantê-lo em `ui/` — ele continua sendo gerenciado pela CLI pelo mesmo nome. Mas se você o **envolve** num wrapper com regra de produto (ex: um `AppButton`), o wrapper é **nosso** e vai para uma pasta de categoria.

### 0.2 Convenção de nomes (arquivos e pastas)

| Item | Convenção | Exemplo |
|---|---|---|
| **Pasta** (categoria ou feature) | `kebab-case` | `data-display/`, `app-shell/`, `booking-wizard/` |
| **Arquivo de componente nosso** | `PascalCase` (igual ao componente exportado) | `StatusBadge.tsx`, `DatePickerField.tsx` |
| **Arquivo primitivo shadcn** | `lowercase` (como a CLI gera — **não renomear**) | `button.tsx`, `select.tsx` |
| **Hook** | `camelCase` com prefixo `use` | `useBookingConfirm.ts` |
| **Barrel de feature** | `index.tsx` | `app-shell/index.tsx` |

A única razão de um arquivo em `ui/` ser lowercase e um custom ser PascalCase é a **origem** (vendored vs nosso) — não é inconsistência, é sinal.

### 0.3 Onde colocar um componente NOSSO

Três níveis, do mais genérico ao mais específico:

```
src/components/
  ui/             # SÓ primitivos shadcn (lowercase, gerenciado pela CLI)

  # --- componentes nossos compartilhados entre rotas, por CATEGORIA (kebab-case) ---
  fields/         # controles de formulário: inputs, pickers, search fields, ícone de input
  feedback/       # comunicação de estado: Alert, EmptyState, StatusBadge
  data-display/   # apresentação atômica read-only: AvatarName, DateTimeCell, FieldRow, TimeDisplay
  sections/       # blocos/cards compostos de página: DetailCard, DangerZone, LinkedAccountsCard
  loading/        # placeholders de carregamento: Spinner, *Skeleton
  navigation/     # chrome de navegação/controles: BackButton, ViewButton, PageHeader, ThemeToggle

  # --- componentes de uma FEATURE inteira (kebab-case) ---
  app-shell/        # casca da app (sidebar + header) — composta por vários arquivos + index.tsx
  super-admin-shell/
  booking-wizard/
  support-widget/
  auth/

  # --- Níveis 1 e 2 (específicos de uma rota) NÃO ficam aqui ---
  # ficam em app/<rota>/_components/  (ver seção 3, "Graus de reusabilidade")
```

**Árvore de decisão para um componente novo:**

1. É um primitivo shadcn gerado pela CLI? → `ui/` (lowercase, não renomear).
2. Só faz sentido dentro de **uma rota**? → `app/<rota>/_components/` (Nível 1/2 da seção 3).
3. É reutilizado **entre rotas**? → escolha a **categoria** em `components/<categoria>/` (PascalCase).
4. É um pedaço de uma **feature composta** (várias partes + estado próprio)? → `components/<feature-kebab>/`.

> Promova de `_components/` de rota para `components/<categoria>/` **somente quando o reuso entre rotas for real, não hipotético** (mesma regra da seção 3).

### 0.4 Em qual categoria?

| Se o componente… | Categoria |
|---|---|
| recebe input do usuário / integra com React Hook Form | `fields/` |
| comunica estado (sucesso/erro/vazio/status) | `feedback/` |
| só exibe dado formatado, sem interação relevante | `data-display/` |
| é um card/bloco composto de uma seção de página | `sections/` |
| é um placeholder enquanto carrega | `loading/` |
| é controle de chrome (voltar, ver, header de página, tema) | `navigation/` |

Na dúvida entre `data-display/` e `sections/`: **átomo** (uma informação) → `data-display`; **composição** (várias informações + possíveis ações, vira uma "seção") → `sections`.

---

## 1. Server Component vs Client Component

No App Router, **Server Component é o default**. Adicione `"use client"` apenas quando precisar de interatividade — não como ponto de partida. Empurre `"use client"` para as folhas da árvore; um componente de layout raramente precisa ser client.

### Quando usar Server Component (default)
- Buscar dados diretamente (banco, API interna, CMS)
- Acessar variáveis de ambiente sem expor ao browser
- Renderizar conteúdo pesado sem enviar JS para o cliente
- Componentes puramente apresentacionais

### Quando usar `"use client"`
- Hooks do React (`useState`, `useEffect`, `useReducer`)
- Event handlers (`onClick`, `onChange`)
- APIs do browser (`window`, `localStorage`, `navigator`)
- Animações e interações em tempo real

```tsx
// ✅ Server Component busca dados, passa para Client Component
// app/dashboard/page.tsx
import { StatsChart } from "./_components/StatsChart";

export default async function DashboardPage() {
  const stats = await fetchStats(); // await direto, sem useEffect
  return <StatsChart data={stats} />;
}

// app/dashboard/_components/StatsChart.tsx
"use client";
import { useState } from "react";

export function StatsChart({ data }: { data: Stats[] }) {
  const [filter, setFilter] = useState("week");
  // ...
}
```

---

## 2. Extração de Lógica para Custom Hooks

Componentes devem descrever **o que renderizar**. Lógica de estado, efeitos colaterais e derivações pertencem a custom hooks — mesmo que o hook seja usado em um único lugar.

### Sintoma de que a extração é necessária

```tsx
// ❌ Componente acumulando responsabilidades
"use client";

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchProducts({ page, search })
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search]);

  const handleSearch = (term: string) => {
    setSearch(term);
    setPage(1);
  };

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div>
      <SearchInput onSearch={handleSearch} />
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
      <Pagination page={page} onPageChange={setPage} />
    </div>
  );
}
```

```tsx
// ✅ Lógica extraída — componente só renderiza
"use client";

import { useProductList } from "./_hooks/useProductList";

export function ProductList() {
  const { products, loading, error, page, setPage, handleSearch } =
    useProductList();

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div>
      <SearchInput onSearch={handleSearch} />
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
      <Pagination page={page} onPageChange={setPage} />
    </div>
  );
}
```

```ts
// _hooks/useProductList.ts
"use client";

import { useState, useEffect } from "react";

export function useProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchProducts({ page, search })
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search]);

  const handleSearch = (term: string) => {
    setSearch(term);
    setPage(1); // reset ao buscar
  };

  return { products, loading, error, page, setPage, handleSearch };
}
```

### Quando extrair

| Situação | Extrair? |
|---|---|
| 3+ `useState` relacionados no mesmo componente | ✅ Sempre |
| `useEffect` com lógica não trivial | ✅ Sempre |
| Mesma lógica usada em 2+ lugares | ✅ Sempre |
| `useState` simples de toggle de UI (ex: modal aberto) | ❌ Deixar no componente |
| Derivação simples sem efeito colateral | ❌ Variável local resolve |

### Hooks de domínio vs hooks de UI

```ts
// Hook de domínio — lida com dados e regras de negócio
export function useAppointmentForm(appointmentId?: string) { ... }

// Hook de UI — lida com comportamento visual
export function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((v) => !v),
  };
}
```

Hooks de domínio ficam próximos à feature (`_hooks/` na pasta da rota ou `hooks/` do domínio). Hooks de UI genéricos ficam em `src/hooks/`.

### Não extraia cedo demais

Se o componente tem um `useState` e um handler simples, a extração adiciona indireção sem benefício. O trigger real é **complexidade crescente ou reuso** — não o número de linhas.

---

## 3. DRY e Extração de Componentes

Quando o mesmo trecho de JSX aparece em mais de um lugar — ou quando um bloco cresce a ponto de obscurecer a intenção do componente pai — é hora de extrair.

### Sintoma: repetição literal de JSX

```tsx
// ❌ Mesmo card duplicado em duas páginas
// app/dashboard/page.tsx
<div className="rounded-lg border p-4 shadow-sm">
  <p className="text-sm text-muted-foreground">Agendamentos hoje</p>
  <span className="text-2xl font-bold">{todayCount}</span>
</div>

// app/reports/page.tsx
<div className="rounded-lg border p-4 shadow-sm">
  <p className="text-sm text-muted-foreground">Total do mês</p>
  <span className="text-2xl font-bold">{monthTotal}</span>
</div>
```

```tsx
// ✅ Extraído — variações viram props (componente nosso → categoria, não ui/)
// components/data-display/StatCard.tsx
interface StatCardProps {
  label: string;
  value: number | string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}

// uso
<StatCard label="Agendamentos hoje" value={todayCount} />
<StatCard label="Total do mês" value={monthTotal} />
```

### Sintoma: bloco grande dentro de um componente maior

Quando um trecho tem identidade própria (nome natural, responsabilidade clara), ele merece ser um componente — mesmo que só apareça uma vez.

```tsx
// ❌ Formulário inteiro embutido na página
export default function NewAppointmentPage() {
  return (
    <main>
      <h1>Novo agendamento</h1>

      {/* 60 linhas de formulário aqui */}
      <form>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Profissional</label>
            <Select options={professionals} />
          </div>
          <div>
            <label>Serviço</label>
            <Select options={services} />
          </div>
          {/* ... */}
        </div>
        <Button type="submit">Confirmar</Button>
      </form>
    </main>
  );
}
```

```tsx
// ✅ Bloco com identidade própria extraído
export default function NewAppointmentPage() {
  return (
    <main>
      <h1>Novo agendamento</h1>
      <AppointmentForm />
    </main>
  );
}
```

### Quando extrair vs quando deixar inline

| Sinal | Ação |
|---|---|
| JSX idêntico (ou quase) em 2+ lugares | Extrair sempre |
| Bloco com nome natural óbvio (`AppointmentForm`, `UserAvatar`) | Extrair |
| Bloco com lógica própria (estado, efeito, handlers) | Extrair |
| Componente pai ultrapassa ~80 linhas de JSX | Considerar extração |
| Trecho pequeno e sem reuso previsível | Deixar inline |
| Extração exigiria passar 5+ props para algo trivial | Deixar inline |

### Graus de reusabilidade

Nem todo componente extraído precisa ser genérico. Extraia para o nível de abstração necessário, não além.

```tsx
// Nível 1 — específico de domínio (não reutilizável, mas organizado)
// app/appointments/_components/AppointmentStatusBadge.tsx
export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) { ... }

// Nível 2 — reutilizável dentro da feature
// app/appointments/_components/AppointmentCard.tsx
export function AppointmentCard({ appointment }: { appointment: Appointment }) { ... }

// Nível 3 — componente nosso genérico, compartilhado entre rotas
// vai para a CATEGORIA correspondente (ver seção 0.3), NUNCA em ui/
// components/feedback/StatusBadge.tsx
export function StatusBadge({ label, variant }: StatusBadgeProps) { ... }
```

Componentes de nível 1 e 2 ficam em `_components/` da rota. Só promova para a categoria certa em `components/<categoria>/` (seção 0.3) quando o reuso entre rotas for real, não hipotético. **Componente nosso nunca vai para `components/ui/`** — essa pasta é só dos primitivos shadcn (seção 0.1).

### Composição sobre configuração excessiva

Quando um componente começa a acumular muitas props condicionais, prefira composição.

```tsx
// ❌ Prop drilling condicional — difícil de ler e estender
<Card
  title="Perfil"
  showAvatar
  showEditButton
  editButtonLabel="Editar perfil"
  avatarUrl={user.avatarUrl}
  onEditClick={handleEdit}
/>

// ✅ Composição — o pai decide o que renderizar
<Card>
  <Card.Header>
    <Avatar src={user.avatarUrl} />
    <Card.Title>Perfil</Card.Title>
    <Button onClick={handleEdit}>Editar perfil</Button>
  </Card.Header>
  <Card.Body>{/* ... */}</Card.Body>
</Card>
```

O padrão de composição usa `children` e subcomponentes (via `Card.Header`, `Card.Body`) para dar ao consumidor controle do layout sem proliferar props.
