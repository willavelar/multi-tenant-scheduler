# Date/Time Formatting Abstraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize date/time formatting logic in the frontend so all displays and inputs respect the user's configured time format (12h/24h).

**Architecture:** Add pure formatting functions to `lib/time.ts`, expose them via a `useFormatTime` hook that binds user preferences, and replace all direct format calls and raw `<input type="time">` usages with these abstractions.

**Tech Stack:** Next.js 16, React 19, TypeScript — no new dependencies.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `packages/web/src/lib/time.ts` | Add `formatISOTime(iso, format)` and `formatHour(h, format)` |
| Create | `packages/web/src/hooks/useFormatTime.ts` | Hook binding format functions to user preferences |
| Create | `packages/web/src/components/ui/TimeInputField.tsx` | `<input type="time">` with correct `lang` attribute |
| Modify | `packages/web/src/lib/calendarUtils.ts` | Remove `formatISOTime` (moved to `lib/time.ts`) |
| Modify | `packages/web/src/components/ui/TimeDisplay.tsx` | Use `useFormatTime` hook |
| Modify | `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarEventBlock.tsx` | Use `useFormatTime().formatISOTime` |
| Modify | `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarMonthEvent.tsx` | Use `useFormatTime().formatISOTime` |
| Modify | `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx` | Use `useFormatTime().formatISOTime` |
| Modify | `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarWeekGrid.tsx` | Use `useFormatTime().formatHour` for hour labels |
| Modify | `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarDayGrid.tsx` | Use `useFormatTime().formatHour` for hour labels |
| Modify | `packages/web/src/app/(tenant)/(app)/professionals/_components/ScheduleCard.tsx` | Replace local `TimeInput` with `TimeInputField` |
| Modify | `packages/web/src/app/(tenant)/(app)/professionals/_components/ExceptionsCard.tsx` | Replace local `TimeField`'s input with `TimeInputField` |
| Modify | `packages/web/src/components/BookingWizard/StepDateTime.tsx` | Format slot strings with `useFormatTime().formatTime` |
| Modify | `packages/web/src/components/BookingWizard/StepConfirm.tsx` | Format `startTime` with `useFormatTime().formatTime` |

---

## Task 1: Add pure formatting functions to `lib/time.ts`

**Files:**
- Modify: `packages/web/src/lib/time.ts`

- [ ] **Step 1: Add `formatISOTime` and `formatHour` to the file**

Open `packages/web/src/lib/time.ts`. It currently exports `TIMEZONES` and `formatTime`. Append these two functions at the end of the file:

```ts
export function formatISOTime(iso: string, format: '12h' | '24h'): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return formatTime(`${hh}:${mm}`, format)
}

export function formatHour(h: number, format: '12h' | '24h'): string {
  if (h === 0) return ''
  if (format === '24h') return `${String(h).padStart(2, '0')}:00`
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12} ${period}`
}
```

- [ ] **Step 2: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/lib/time.ts
git commit -m "feat(web): add formatISOTime and formatHour to lib/time"
```

---

## Task 2: Create `useFormatTime` hook

**Files:**
- Create: `packages/web/src/hooks/useFormatTime.ts`

- [ ] **Step 1: Create the file**

```ts
'use client'

import { useUserPreferences } from '@/providers/UserPreferencesProvider'
import { formatTime, formatISOTime, formatHour } from '@/lib/time'

export function useFormatTime() {
  const { timeFormat } = useUserPreferences()
  return {
    formatTime:    (time: string) => formatTime(time, timeFormat),
    formatISOTime: (iso: string)  => formatISOTime(iso, timeFormat),
    formatHour:    (h: number)    => formatHour(h, timeFormat),
    timeFormat,
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/hooks/useFormatTime.ts
git commit -m "feat(web): add useFormatTime hook"
```

---

## Task 3: Create `TimeInputField` component

**Files:**
- Create: `packages/web/src/components/ui/TimeInputField.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useFormatTime } from '@/hooks/useFormatTime'

type Props = {
  value:     string
  onChange:  (v: string) => void
  disabled?: boolean
  className?: string
}

export function TimeInputField({ value, onChange, disabled, className }: Props) {
  const { timeFormat } = useFormatTime()
  const lang = timeFormat === '24h' ? 'pt-BR' : 'en-US'
  return (
    <input
      type="time"
      lang={lang}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={className}
    />
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/TimeInputField.tsx
git commit -m "feat(web): add TimeInputField component"
```

---

## Task 4: Update calendar appointment display components

These three components currently import `formatISOTime` from `calendarUtils`. Switch them to the hook before `calendarUtils` loses the export.

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarEventBlock.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarMonthEvent.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx`

- [ ] **Step 1: Update `CalendarEventBlock.tsx`**

Replace the entire file content:

```tsx
'use client'

import type { Appointment } from '@/types'
import { useFormatTime } from '@/hooks/useFormatTime'

type Props = {
  appointment: Appointment
  color: string
  top: number
  height: number
  columnIndex: number
  columnCount: number
  onClick: (rect: DOMRect) => void
}

export function CalendarEventBlock({ appointment, color, top, height, columnIndex, columnCount, onClick }: Props) {
  const { formatISOTime } = useFormatTime()
  const widthPct = 100 / columnCount
  const leftPct = (columnIndex * 100) / columnCount

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    onClick((e.currentTarget as HTMLElement).getBoundingClientRect())
  }

  return (
    <div
      className="absolute rounded-md cursor-pointer overflow-hidden select-none px-1.5 py-0.5 hover:brightness-90 transition-all z-10"
      style={{
        top: top + 1,
        height: height - 2,
        left: `calc(${leftPct}% + 1px)`,
        width: `calc(${widthPct}% - 2px)`,
        background: color,
      }}
      onClick={handleClick}
    >
      <p className="text-white text-[11px] font-semibold truncate leading-tight m-0">
        {appointment.clientName}
      </p>
      {height >= 32 && (
        <>
          <p className="text-white/85 text-[10px] truncate leading-tight m-0">
            {appointment.serviceName}
          </p>
          <p className="text-white/75 text-[10px] leading-tight m-0">
            {formatISOTime(appointment.startsAt)} – {formatISOTime(appointment.endsAt)}
          </p>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update `CalendarMonthEvent.tsx`**

Replace the entire file content:

```tsx
'use client'

import type { Appointment } from '@/types'
import { useFormatTime } from '@/hooks/useFormatTime'

type Props = {
  appointment: Appointment
  color: string
  onClick: (rect: DOMRect) => void
}

export function CalendarMonthEvent({ appointment, color, onClick }: Props) {
  const { formatISOTime } = useFormatTime()

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    onClick((e.currentTarget as HTMLElement).getBoundingClientRect())
  }

  return (
    <button
      className="w-full flex items-center gap-1 rounded px-1 py-0.5 mb-0.5 text-left overflow-hidden cursor-pointer hover:brightness-90 transition-all border-none"
      style={{ background: color }}
      onClick={handleClick}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
      <span className="text-white text-[10px] font-medium truncate">
        {formatISOTime(appointment.startsAt)} {appointment.clientName}
      </span>
    </button>
  )
}
```

- [ ] **Step 3: Update `AppointmentPopover.tsx`**

At the top of the file, remove this import:
```ts
import { formatISOTime } from '@/lib/calendarUtils'
```

Add this import in its place:
```ts
import { useFormatTime } from '@/hooks/useFormatTime'
```

Inside the `AppointmentPopover` function body, add the hook call right after the existing hook calls (after `useTenantSettingsContext`):
```ts
const { formatISOTime } = useFormatTime()
```

The lines that use `formatISOTime` already exist and don't need changing:
```ts
const startStr = formatISOTime(appointment.startsAt)
const endStr = formatISOTime(appointment.endsAt)
```

- [ ] **Step 4: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/\(tenant\)/\(app\)/appointments/_components/CalendarEventBlock.tsx
git add packages/web/src/app/\(tenant\)/\(app\)/appointments/_components/CalendarMonthEvent.tsx
git add packages/web/src/app/\(tenant\)/\(app\)/appointments/_components/AppointmentPopover.tsx
git commit -m "feat(web): use useFormatTime in calendar appointment components"
```

---

## Task 5: Remove `formatISOTime` from `calendarUtils.ts`

All consumers have been updated. Now remove the now-unused export.

**Files:**
- Modify: `packages/web/src/lib/calendarUtils.ts`

- [ ] **Step 1: Delete `formatISOTime` from `calendarUtils.ts`**

Remove lines 105–108 (the `formatISOTime` function):

```ts
// DELETE these lines:
export function formatISOTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
```

- [ ] **Step 2: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: no errors. If any file still imports `formatISOTime` from `calendarUtils`, it will show here — fix by switching to `useFormatTime`.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/lib/calendarUtils.ts
git commit -m "refactor(web): remove formatISOTime from calendarUtils"
```

---

## Task 6: Update calendar grid hour labels

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarWeekGrid.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarDayGrid.tsx`

- [ ] **Step 1: Update `CalendarWeekGrid.tsx`**

Add the hook import at the top of the file (alongside existing imports):
```ts
import { useFormatTime } from '@/hooks/useFormatTime'
```

Inside `CalendarWeekGrid`, add the hook call right after the `scrollRef`:
```ts
const { formatHour } = useFormatTime()
```

Replace the hour label rendering (currently inside the "Time labels" section):
```tsx
// BEFORE:
{h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}

// AFTER:
{formatHour(h)}
```

- [ ] **Step 2: Update `CalendarDayGrid.tsx`**

Add the hook import at the top of the file:
```ts
import { useFormatTime } from '@/hooks/useFormatTime'
```

Inside `CalendarDayGrid`, add the hook call right after `const layout = layoutAppointments(appointments)`:
```ts
const { formatHour } = useFormatTime()
```

Replace the hour label rendering:
```tsx
// BEFORE:
{h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}

// AFTER:
{formatHour(h)}
```

- [ ] **Step 3: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/\(tenant\)/\(app\)/appointments/_components/CalendarWeekGrid.tsx
git add packages/web/src/app/\(tenant\)/\(app\)/appointments/_components/CalendarDayGrid.tsx
git commit -m "feat(web): use formatHour for calendar grid hour labels"
```

---

## Task 7: Update `TimeDisplay` component

**Files:**
- Modify: `packages/web/src/components/ui/TimeDisplay.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
'use client'

import { useFormatTime } from '@/hooks/useFormatTime'

export function TimeDisplay({ time }: { time: string }) {
  const { formatTime } = useFormatTime()
  return <span>{formatTime(time)}</span>
}
```

- [ ] **Step 2: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/TimeDisplay.tsx
git commit -m "refactor(web): simplify TimeDisplay to use useFormatTime"
```

---

## Task 8: Update time inputs in professional schedule components

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/_components/ScheduleCard.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/_components/ExceptionsCard.tsx`

- [ ] **Step 1: Update `ScheduleCard.tsx`**

Add the import at the top of the file (alongside existing imports):
```ts
import { TimeInputField } from '@/components/ui/TimeInputField'
```

Delete the entire local `TimeInput` function (lines 29–41):
```tsx
// DELETE this entire function:
function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        'h-8 w-[110px] px-2 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-md outline-none',
        'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors',
      )}
    />
  )
}
```

Replace the two usages of `<TimeInput` in `AddForm` with `<TimeInputField`:
```tsx
// BEFORE:
<TimeInput value={start} onChange={setStart} />
// ...
<TimeInput value={end} onChange={setEnd} />

// AFTER:
<TimeInputField
  value={start}
  onChange={setStart}
  className="h-8 w-[110px] px-2 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-md outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
/>
// ...
<TimeInputField
  value={end}
  onChange={setEnd}
  className="h-8 w-[110px] px-2 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-md outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
/>
```

Remove unused `cn` import if `cn` is no longer used elsewhere in the file — check by scanning remaining usages first. (If still used elsewhere, keep it.)

- [ ] **Step 2: Update `ExceptionsCard.tsx`**

Add the import at the top of the file:
```ts
import { TimeInputField } from '@/components/ui/TimeInputField'
```

Inside the `TimeField` function, replace the `<input>` element with `<TimeInputField>`:

```tsx
// BEFORE:
function TimeField({ label, value, onChange, disabled }: {
  label:    string
  value:    string
  onChange: (v: string) => void
  disabled: boolean
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">
        {label}
      </label>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'h-8 w-[110px] px-2 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-md outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
      />
    </div>
  )
}

// AFTER:
function TimeField({ label, value, onChange, disabled }: {
  label:    string
  value:    string
  onChange: (v: string) => void
  disabled: boolean
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">
        {label}
      </label>
      <TimeInputField
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'h-8 w-[110px] px-2 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-md outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
      />
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/\(tenant\)/\(app\)/professionals/_components/ScheduleCard.tsx
git add packages/web/src/app/\(tenant\)/\(app\)/professionals/_components/ExceptionsCard.tsx
git commit -m "feat(web): use TimeInputField in schedule and exceptions inputs"
```

---

## Task 9: Update booking wizard

**Files:**
- Modify: `packages/web/src/components/BookingWizard/StepDateTime.tsx`
- Modify: `packages/web/src/components/BookingWizard/StepConfirm.tsx`

- [ ] **Step 1: Update `StepDateTime.tsx`**

Add the hook import at the top of the file:
```ts
import { useFormatTime } from '@/hooks/useFormatTime'
```

Inside `StepDateTime`, add the hook call right after the `useSlots` call:
```ts
const { formatTime } = useFormatTime()
```

Replace the slot button content:
```tsx
// BEFORE:
<Button key={slot} variant="outline" size="sm" onClick={() => onSelect(toLocalDateString(selectedDate!), slot)}>
  {slot}
</Button>

// AFTER:
<Button key={slot} variant="outline" size="sm" onClick={() => onSelect(toLocalDateString(selectedDate!), slot)}>
  {formatTime(slot)}
</Button>
```

- [ ] **Step 2: Update `StepConfirm.tsx`**

Add the hook import at the top of the file:
```ts
import { useFormatTime } from '@/hooks/useFormatTime'
```

Inside `StepConfirm`, add the hook call right after the existing hook calls (after `useQueryClient`):
```ts
const { formatTime } = useFormatTime()
```

Replace the two `{startTime}` usages with `{formatTime(startTime)}`:

In the success screen:
```tsx
// BEFORE:
<p className="text-sm text-gray-500">{date} às {startTime}</p>

// AFTER:
<p className="text-sm text-gray-500">{date} às {formatTime(startTime)}</p>
```

In the confirmation summary:
```tsx
// BEFORE:
<span className="font-medium">{startTime}</span>

// AFTER:
<span className="font-medium">{formatTime(startTime)}</span>
```

- [ ] **Step 3: Type-check**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/BookingWizard/StepDateTime.tsx
git add packages/web/src/components/BookingWizard/StepConfirm.tsx
git commit -m "feat(web): format times in booking wizard using user preferences"
```

---

## Final Verification

- [ ] **Type-check the full project**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Smoke test manually**

1. Log in as a user with `timeFormat: '12h'` and verify:
   - Calendar event blocks show times in AM/PM format
   - Month view events show times in AM/PM format
   - Appointment popover shows start/end in AM/PM
   - Calendar hour labels show `8 AM`, `12 PM`, `1 PM`
   - Schedule time inputs display in AM/PM in the browser
   - Booking wizard slot buttons show in AM/PM
2. Switch to `timeFormat: '24h'` and verify the reverse.
