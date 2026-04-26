# Appointment Period Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Período" select filter (Todos / Futuros / Passados) to the appointments listing that hides the manual date pickers and injects computed dates when active.

**Architecture:** Single file change in `appointments/page.tsx`. A `timeRange` state drives a helper that computes `effectiveDateFrom`/`effectiveDateTo` from local date arithmetic, replacing the manual `dateFrom`/`dateTo` inputs when a period is selected. No API or hook changes.

**Tech Stack:** Next.js 16, React, Tailwind CSS.

---

## Files

| Ação | Arquivo |
|---|---|
| Modify | `packages/web/src/app/(tenant)/(app)/appointments/page.tsx` |

---

## Task 1: Adicionar filtro de período na página de agendamentos

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/page.tsx`

- [ ] **Step 1: Adicionar estado `timeRange` e helper de data local**

Logo após as declarações de estado existentes (após `professionalDisplayValue`), adicionar:

```tsx
const [timeRange, setTimeRange] = useState<'' | 'future' | 'past'>('')
```

E logo antes do bloco `const { data: servicesList }`, adicionar o helper:

```tsx
function localDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
```

- [ ] **Step 2: Computar datas efetivas a partir do período**

Substituir a linha:
```tsx
const filters = { dateFrom, dateTo, serviceId, status, clientId, professionalId }
```

Por:
```tsx
let effectiveDateFrom = dateFrom
let effectiveDateTo   = dateTo
if (timeRange === 'future') {
  effectiveDateFrom = localDateStr(new Date())
  effectiveDateTo   = ''
} else if (timeRange === 'past') {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  effectiveDateFrom = ''
  effectiveDateTo   = localDateStr(yesterday)
}

const filters = { dateFrom: effectiveDateFrom, dateTo: effectiveDateTo, serviceId, status, clientId, professionalId }
```

- [ ] **Step 3: Atualizar `hasFilters`, `clearFilters` e `useEffect`**

Substituir a linha:
```tsx
const hasFilters = !!(dateFrom || dateTo || serviceId || status || clientId || professionalId)
```
Por:
```tsx
const hasFilters = !!(timeRange || dateFrom || dateTo || serviceId || status || clientId || professionalId)
```

Substituir a função `clearFilters`:
```tsx
function clearFilters() {
  setTimeRange('')
  setDateFrom('');  setDateTo('')
  setServiceId(''); setStatus('');  setClientId(''); setProfessionalId('')
  setClientDisplayValue(''); setProfessionalDisplayValue('')
}
```

Substituir o `useEffect` de reset de página:
```tsx
useEffect(() => { setPage(1) }, [timeRange, dateFrom, dateTo, serviceId, status, clientId, professionalId])
```

- [ ] **Step 4: Adicionar o select "Período" e ocultar date pickers quando ativo**

No JSX dos filtros, substituir o bloco dos dois date pickers ("De" e "Até"):

```tsx
{/* Date From */}
<div className="min-w-[140px] flex-[1_1_140px]">
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">De</label>
  <DatePickerField
    value={dateFrom}
    onChange={setDateFrom}
    inputClassName="h-9 text-[13px]"
  />
</div>

{/* Date To */}
<div className="min-w-[140px] flex-[1_1_140px]">
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">Até</label>
  <DatePickerField
    value={dateTo}
    onChange={setDateTo}
    inputClassName="h-9 text-[13px]"
  />
</div>
```

Por:
```tsx
{/* Period */}
<div className="min-w-[140px] flex-[1_1_140px]">
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">Período</label>
  <div className="relative">
    <select
      className="h-9 w-full pl-3 pr-8 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
      value={timeRange}
      onChange={e => setTimeRange(e.target.value as '' | 'future' | 'past')}
    >
      <option value="">Todos</option>
      <option value="future">Futuros</option>
      <option value="past">Passados</option>
    </select>
    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
  </div>
</div>

{/* Date pickers — hidden when a period is active */}
{timeRange === '' && (
  <>
    <div className="min-w-[140px] flex-[1_1_140px]">
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">De</label>
      <DatePickerField
        value={dateFrom}
        onChange={setDateFrom}
        inputClassName="h-9 text-[13px]"
      />
    </div>

    <div className="min-w-[140px] flex-[1_1_140px]">
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">Até</label>
      <DatePickerField
        value={dateTo}
        onChange={setDateTo}
        inputClassName="h-9 text-[13px]"
      />
    </div>
  </>
)}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd /home/willavelar/Projects/MyOwn/NODEJS/scheduler
pnpm --filter web build 2>&1 | grep -E "error TS|Type error" | head -10
```

Esperado: sem erros de TypeScript.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/appointments/page.tsx
git commit -m "feat(web): add period filter (past/future) to appointments listing"
```
