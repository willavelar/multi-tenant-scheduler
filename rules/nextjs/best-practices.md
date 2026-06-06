# Next.js Best Practices

Guia de boas práticas para projetos Next.js com App Router (v13+).

> **Regras de componentes** — Server vs Client Components, extração de lógica para custom hooks, e DRY/extração de componentes — ficam em [`new-components.md`](./new-components.md), a fonte única dessas regras. Este guia cobre o restante.

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
