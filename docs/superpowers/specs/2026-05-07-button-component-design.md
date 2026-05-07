# Button Component Design

**Data:** 2026-05-07
**Status:** Aprovado

## Objetivo

Unificar todos os botões da aplicação em um único componente `Button`, substituindo os ~50 `<button>` com classes inline espalhados por formulários, listagens e modais. O componente existente em `components/ui/button.tsx` (shadcn/base-ui) será reescrito para refletir o design system real do app (indigo como primário), e os poucos consumidores shadcn serão migrados junto.

## O que está fora do escopo

Os seguintes botões **não são migrados** por terem estilos e comportamentos altamente específicos:

- Botões das páginas de **auth** (`login`, `register`, `forgot-password`, `reset-password`, `activate-account`) — azul `bg-blue-600` com sombra e animação de elevação, identidade visual intencional das telas de entrada
- **ThemeToggle** — ícone animado, estado de `mounted` para hidratação
- **Toggles e controles segmentados** em Settings General (cancel reason mode, deadline unit)
- **Cards de seleção** no wizard de criação de agendamento (serviço, profissional, data, horário) — são seletores, não ações
- Botões internos do **AppointmentPopover** (circular, com estado de popover)
- Botões de **navegação do Header** (user menu trigger)

## Variantes de cor

| Variante | Aparência | Uso principal |
|---|---|---|
| `primary` | Indigo cheio (`bg-indigo-500 hover:bg-indigo-600`) | Submit de formulários, "Novo X" nas listagens |
| `secondary` | Fundo `bg-background`, borda `border-border`, hover `bg-accent` | Cancelar, voltar, limpar filtros, paginação |
| `destructive` | Vermelho cheio (`bg-red-600 hover:bg-red-700`) | Excluir (DangerZone), cancelar agendamento |
| `destructive-outline` | Borda e texto vermelhos, hover fundo vermelho suave | "Remover" inline nas linhas de horário (ScheduleCard) |
| `ghost` | Sem borda, sem fundo; hover `bg-accent` | BackButton ghost, ações leves de link |

Todas as variantes usam CSS variables do tema (`bg-background`, `text-foreground`, `border-border`, `bg-accent`) e funcionam nos modos claro e escuro sem classes `dark:` extras, exceto `primary` e `destructive` que usam cores Tailwind fixas (indigo/red) — já adequadas nos dois modos.

## Variantes de tamanho

| Size | Altura | Padding H | Texto | Uso |
|---|---|---|---|---|
| `lg` | 42px (`h-[42px]`) | `px-6` | `text-sm` | Submit principal de formulários |
| `md` | 36px (`h-9`) | `px-4` | `text-[13.5px]` | Modais, PageHeader action — mesma altura que `sm`, padding maior |
| `sm` | 36px (`h-9`) | `px-3.5` | `text-[13px]` | "Limpar filtros", BackButton border — mesma altura que `md`, padding menor |
| `xs` | 28px (`h-7`) | `px-2.5` | `text-xs` | Linhas de tabela (ver, adicionar, remover) |

## API do componente

```tsx
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:  'primary' | 'secondary' | 'destructive' | 'destructive-outline' | 'ghost'
  size?:     'lg' | 'md' | 'sm' | 'xs'
  icon?:     React.ReactNode   // SVG passado como ReactNode, renderizado à esquerda do texto
  loading?:  boolean           // exibe spinner, desabilita o botão
  children?: React.ReactNode
  className?: string
}
```

- `icon` é renderizado à **esquerda** do texto (`gap-1.5` entre ícone e label)
- Quando `loading=true`: exibe spinner animado no lugar do ícone (ou à esquerda se não houver ícone), `disabled` é forçado, cursor `not-allowed`
- O spinner é o mesmo SVG já usado nos formulários (`animate-spin`, 14×14px)
- `disabled` aplica `opacity-65 cursor-not-allowed pointer-events-none`
- `className` permite overrides pontuais (ex.: `w-full` para botão de largura total)
- Padrões: `variant="primary"`, `size="md"`

## Implementação técnica

### Arquivo

`packages/web/src/components/ui/button.tsx` — **reescrito** do zero, removendo a dependência de `@base-ui/react/button` e `class-variance-authority`. O novo componente usa `React.forwardRef` sobre um `<button>` nativo com classes Tailwind.

`class-variance-authority` (cva) pode ser mantido para organização das variantes, mas a dependência do `@base-ui/react/button` é removida.

### Estrutura interna

```tsx
const buttonVariants = cva(
  // base: inline-flex, gap, rounded, font-medium, transition, disabled, cursor
  [...],
  {
    variants: {
      variant: { primary: [...], secondary: [...], destructive: [...], 'destructive-outline': [...], ghost: [...] },
      size:    { lg: [...], md: [...], sm: [...], xs: [...] },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, icon, loading, disabled, children, className, ...props }, ref) => {
    const isDisabled = disabled || loading
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? <Spinner /> : icon}
        {children}
      </button>
    )
  }
)
```

### BackButton

`components/ui/BackButton.tsx` é atualizado para usar `Button` internamente:
- `variant="border"` → `<Button variant="secondary" size="sm" icon={<ChevronLeft />}>`
- `variant="ghost"` → `<Button variant="ghost" size="sm" icon={<ChevronLeft />}>`

O componente continua encapsulando o `router.push`.

### PageHeader

`components/ui/PageHeader.tsx` atualizado: o botão de ação usa `<Button variant="secondary" size="md">` (padrão) ou `<Button variant="destructive" size="md">` quando `action.variant === 'destructive'`.

A prop `action.icon` é adicionada opcionalmente para passar ícone SVG.

### ScheduleCard

`TextBtn` interno é removido. As chamadas são substituídas por:
- `<Button variant="secondary" size="xs">Adicionar</Button>`  
- `<Button variant="destructive-outline" size="xs">Remover</Button>`

### DangerZone

Todos os `<button>` internos substituídos por:
- Botão principal de excluir: `<Button variant="destructive" size="md">`
- Confirmação "Sim, excluir": `<Button variant="destructive" size="md" loading={pending}>`
- Cancelar/Manter/Fechar: `<Button variant="secondary" size="md">`

### Formulários (ProfessionalForm, ClientForm, ServiceForm, AdminForm, TenantGeneralForm)

- Submit: `<Button type="submit" variant="primary" size="lg" loading={isPending} icon={<SaveIcon />}>`
- Cancelar: `<Button variant="secondary" size="lg">`

### Páginas de listagem (appointments, clients, professionals, admins, services)

- "Novo X": `<Button variant="primary" size="md" icon={<PlusIcon />}>`
- "Limpar filtros": `<Button variant="secondary" size="sm">`
- "Ver": `<Button variant="primary" size="xs">`
- Paginação prev/next: `<Button variant="secondary" size="sm" icon={<ChevronIcon />}>`

### CancelAppointmentModal

- Cancelar (fechar modal): `<Button variant="secondary" size="md">`
- Confirmar cancelamento: `<Button variant="destructive" size="md" loading={pending}>`

### ScheduleCard AddForm (inline time picker confirm/cancel)

- Confirmar horário (verde): este botão usa `bg-emerald-500` — estilo específico de confirmação inline. **Mantido como está** (fora do escopo).

## Compatibilidade shadcn

Os 3 arquivos shadcn que importam do `button.tsx` (`calendar.tsx`, `dialog.tsx`, `sheet.tsx`) usam variantes que não existirão mais (`default`, `outline`). Eles serão atualizados:

- `calendar.tsx`: usa `buttonVariants` para estilizar dias — atualizado para usar `variant="ghost"` (funciona igual)
- `dialog.tsx` e `sheet.tsx`: botão de fechar (×) — atualizado para `variant="ghost" size="xs"`
- `BookingWizard/StepConfirm.tsx`: `variant="outline"` → `variant="secondary"`, `variant="default"` → `variant="primary"`
- `BookingWizard/StepDateTime.tsx`: idem
- `components/Sidebar.tsx` (arquivo legado, não o AppShell/Sidebar.tsx): usa `<Button variant="ghost" size="sm">` para o botão de logout — continua funcionando sem alteração de variante, apenas a altura e o padding mudarão para refletir o novo tamanho `sm`

## Ordem de implementação

1. Reescrever `button.tsx` com as 5 variantes e 4 tamanhos
2. Atualizar `BackButton.tsx` e `PageHeader.tsx`
3. Atualizar shadcn: `calendar.tsx`, `dialog.tsx`, `sheet.tsx`, `BookingWizard/`, `Sidebar.tsx`
4. Atualizar `DangerZone.tsx` e `CancelAppointmentModal.tsx`
5. Atualizar `ScheduleCard.tsx` (remover `TextBtn`)
6. Atualizar formulários: `ProfessionalForm`, `ClientForm`, `ServiceForm`, `AdminForm`, `TenantGeneralForm`
7. Atualizar páginas de listagem: appointments, clients, professionals, admins, services
8. Build e verificação visual
