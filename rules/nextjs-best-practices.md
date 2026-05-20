# Next.js Best Practices

Guia de boas práticas para projetos Next.js com App Router (v13+).

---

## 1. App Router — Modelo Mental Correto

O App Router inverte o padrão antigo: **Server Component é o default**. Você adiciona `"use client"` quando precisa de interatividade, não como ponto de partida.

```
app/
  layout.tsx        ← Server Component (root layout)
  page.tsx          ← Server Component por padrão
  dashboard/
    _components/    ← componentes privados da rota (prefixo _)
      Chart.tsx     ← pode ser Client Component
    page.tsx
```

**Regra prática**: empurre `"use client"` para as folhas da árvore. Um componente de layout raramente precisa ser client.

---

## 2. Server Components vs Client Components

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

## 3. Data Fetching

### Fetch nativo com cache
Next.js estende o `fetch` nativo com opções de cache. Use diretamente nos Server Components.

```tsx
// Cache permanente (padrão — equivale a getStaticProps)
const data = await fetch("https://api.example.com/posts");

// Sem cache — sempre fresh (equivale a getServerSideProps)
const data = await fetch("https://api.example.com/posts", {
  cache: "no-store",
});

// Revalidação por tempo (equivale a ISR)
const data = await fetch("https://api.example.com/posts", {
  next: { revalidate: 60 }, // segundos
});
```

### Revalidação por tag (prefira para invalidação granular)
```tsx
// Ao buscar
const data = await fetch("/api/products", { next: { tags: ["products"] } });

// Ao mutar (Server Action ou Route Handler)
import { revalidateTag } from "next/cache";
revalidateTag("products");
```

### Parallel fetching — evite waterfalls
```tsx
// ❌ Sequencial — cada await bloqueia o próximo
const user = await getUser(id);
const orders = await getOrders(user.id);

// ✅ Paralelo
const [user, orders] = await Promise.all([getUser(id), getOrders(id)]);
```

---

## 4. Server Actions

Use Server Actions para mutações — elas rodam no servidor, simplificam o stack e eliminam Route Handlers para operações simples.

```tsx
// app/actions/create-post.ts
"use server";

import { revalidatePath } from "next/cache";

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;

  await db.insert(posts).values({ title });
  revalidatePath("/posts");
}

// app/posts/new/page.tsx
import { createPost } from "@/actions/create-post";

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button type="submit">Criar</button>
    </form>
  );
}
```

**Validação no servidor sempre** — nunca confie só no cliente:
```ts
"use server";
import { z } from "zod";

const schema = z.object({ title: z.string().min(3).max(100) });

export async function createPost(formData: FormData) {
  const parsed = schema.safeParse({ title: formData.get("title") });
  if (!parsed.success) return { error: parsed.error.flatten() };
  // ...
}
```

---

## 5. Layouts, Loading e Error

### Layouts aninhados
Layouts persistem entre navegações — não remontam. Ideal para sidebars, headers e providers.

```
app/
  layout.tsx          ← root layout (html, body)
  (marketing)/
    layout.tsx        ← layout só para rotas de marketing
    page.tsx
  dashboard/
    layout.tsx        ← sidebar + header do dashboard
    page.tsx
```

Use **Route Groups** `(nome)` para organizar rotas sem afetar a URL.

### loading.tsx — Suspense automático
```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />;
}
```
Next.js envolve `page.tsx` em `<Suspense>` automaticamente usando esse arquivo.

### error.tsx — Error Boundary automático
```tsx
// app/dashboard/error.tsx
"use client"; // obrigatório — Error Boundaries são client-side

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <p>Algo deu errado.</p>
      <button onClick={reset}>Tentar novamente</button>
    </div>
  );
}
```

---

## 6. Metadados e SEO

Prefira a Metadata API estática/dinâmica ao invés de manipular `<head>` manualmente.

```tsx
// Estático
export const metadata: Metadata = {
  title: "Meu App",
  description: "Descrição do app",
};

// Dinâmico
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.slug);
  return {
    title: post.title,
    openGraph: {
      images: [post.coverImage],
    },
  };
}
```

Use `metadataBase` no root layout para resolver URLs absolutas:
```tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://meuapp.com"),
};
```

---

## 7. Otimização de Imagens

Sempre use `next/image`. O componente otimiza automaticamente: lazy loading, formato moderno (WebP/AVIF), redimensionamento.

```tsx
import Image from "next/image";

// Imagem com dimensões conhecidas
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />

// Imagem que ocupa 100% do container
<div className="relative h-64">
  <Image src={user.avatar} alt={user.name} fill className="object-cover" />
</div>
```

- Use `priority` nas imagens above-the-fold (impacta LCP)
- Configure `remotePatterns` em `next.config` para domínios externos

---

## 8. Middleware

Use para lógica que precisa rodar antes do render: autenticação, redirecionamentos, internacionalização, headers de segurança.

```ts
// middleware.ts (na raiz do projeto)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value;

  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/protected/:path*"],
};
```

**Importante**: Middleware roda no Edge Runtime — sem Node.js APIs (`fs`, `crypto` nativo). Use APIs Web padrão.

---

## 9. Route Handlers

Use para webhooks, integrações com terceiros, ou quando Server Actions não são suficientes.

```ts
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  // verificar assinatura...

  return NextResponse.json({ received: true });
}
```

Não crie Route Handlers só para substituir chamadas diretas ao banco — isso adiciona uma camada desnecessária. Para isso use Server Actions ou consulta direta no Server Component.

---

## 10. Extração de Lógica para Custom Hooks

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

## 11. DRY e Extração de Componentes

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
// ✅ Extraído — variações viram props
// components/ui/StatCard.tsx
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

// Nível 3 — primitivo genérico, compartilhado pela aplicação
// components/ui/Badge.tsx
export function Badge({ label, variant }: BadgeProps) { ... }
```

Componentes de nível 1 e 2 ficam em `_components/` da rota. Só promova para `components/` quando o reuso entre rotas for real, não hipotético.

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

---

## 12. Estrutura de Pastas Recomendada

```
src/
  app/                    ← rotas e layouts
    (auth)/               ← grupo de rotas sem segmento na URL
      login/
      register/
    dashboard/
      _components/        ← componentes privados desta rota
      page.tsx
    api/                  ← route handlers
  components/             ← componentes compartilhados entre rotas
    ui/                   ← primitivos (Button, Input, Modal)
  lib/                    ← utilitários, clientes de API, helpers
  hooks/                  ← custom hooks (todos client-side)
  actions/                ← server actions organizadas por domínio
  types/                  ← tipos TypeScript globais
```

---

## 13. Performance

### Streaming com Suspense
Quebre páginas lentas em partes que carregam independentemente:

```tsx
import { Suspense } from "react";

export default function Page() {
  return (
    <div>
      <HeroSection />  {/* renderiza imediato */}
      <Suspense fallback={<Skeleton />}>
        <RecentOrders />  {/* stream quando pronto */}
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <Analytics />  {/* stream independente */}
      </Suspense>
    </div>
  );
}
```

### Bundle splitting
- Componentes pesados importados com `dynamic()` + `ssr: false` para código apenas client-side
- Prefira `import type` para importar apenas tipos (zero impacto no bundle)

```tsx
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});
```

---

## 14. TypeScript

### Tipagem de params e searchParams
```tsx
// App Router — params são sempre string
interface Props {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function Page({ params, searchParams }: Props) {
  const id = params.id;
  const page = Number(searchParams.page ?? 1);
}
```

### Tipagem de Server Actions com estado
```ts
export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function updateProfile(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // ...
  return { success: true };
}
```

---

## 15. Variáveis de Ambiente

| Prefixo | Exposto ao browser | Uso |
|---|---|---|
| `NEXT_PUBLIC_` | ✅ Sim | URLs públicas, chaves de analytics |
| sem prefixo | ❌ Não | Secrets, conexões de banco, API keys |

```ts
// Validação com zod no início da aplicação (lib/env.ts)
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  API_SECRET_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
```

---

## 16. Anti-padrões Comuns

| Anti-padrão | Problema | Alternativa |
|---|---|---|
| `useEffect` para buscar dados | Waterfall + flash de loading | Fetch no Server Component |
| Tudo como `"use client"` | Aumenta bundle, perde SSR | Limite client ao necessário |
| `getServerSideProps` no App Router | API do Pages Router | `async` Server Component direto |
| Criar Route Handler para ler dados | Camada desnecessária | Fetch direto no Server Component |
| `<img>` nativo | Sem otimização | `next/image` |
| Mutar estado global no servidor | Race condition | Server Action → revalidar |
| Ignorar `error.tsx` | UX ruim em falhas | Sempre definir boundary de erro |
