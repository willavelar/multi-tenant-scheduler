# Design: Date/Time Formatting Abstraction

**Date:** 2026-04-29  
**Status:** Approved

## Problem

Users configure a preferred time format (12h or 24h) and timezone in their profile. Several places in the frontend ignore these preferences and always display times in 24h format or defer to the browser's OS locale. Additionally, `<input type="time">` renders in 12h or 24h depending on the OS locale, not the app's setting.

## Scope

Frontend only. No API or database changes.

## What Is Already Correct

- `TimeDisplay` component reads `useUserPreferences` and calls `formatTime` — correct.
- `ScheduleCard` and `ExceptionsCard` display slots via `TimeDisplay` — correct.

## What Is Broken

| Location | Issue |
|---|---|
| `CalendarEventBlock.tsx` | Uses `formatISOTime` from `calendarUtils` — always 24h |
| `CalendarMonthEvent.tsx` | Same |
| `AppointmentPopover.tsx` | Same |
| `CalendarWeekGrid.tsx` | Hour labels hardcoded as `"08:00"` format |
| `CalendarDayGrid.tsx` | Same |
| `ScheduleCard.tsx` (`TimeInput`) | `<input type="time">` respects OS locale, not user preference |
| `ExceptionsCard.tsx` (`TimeField`) | Same |
| `StepDateTime.tsx` | Slot buttons show raw API strings (e.g. `"09:00"`) |
| `StepConfirm.tsx` | Shows raw `startTime` string |

## Architecture

### 1. `lib/time.ts` — Pure Formatting Functions

Extend the existing file with two new exports. All functions are pure (no React dependency) and take `format` explicitly.

```ts
// Already exists
formatTime(time: string, format: '12h' | '24h'): string

// New — extracts HH:mm from ISO datetime, delegates to formatTime
formatISOTime(iso: string, format: '12h' | '24h'): string

// New — formats hour 0–23 to calendar label
// 24h: 0→"", 8→"08:00", 14→"14:00"
// 12h: 0→"", 8→"8 AM",  12→"12 PM", 13→"1 PM"
formatHour(h: number, format: '12h' | '24h'): string
```

`formatISOTime` currently in `calendarUtils.ts` is deleted — `calendarUtils` becomes layout/math only.

### 2. `hooks/useFormatTime.ts` — Context Binding Hook

New hook that reads `useUserPreferences` and returns the three functions pre-bound to the user's format:

```ts
function useFormatTime() {
  const { timeFormat } = useUserPreferences()
  return {
    formatTime:    (time: string) => formatTime(time, timeFormat),
    formatISOTime: (iso: string)  => formatISOTime(iso, timeFormat),
    formatHour:    (h: number)    => formatHour(h, timeFormat),
    timeFormat,
  }
}
```

### 3. `components/ui/TimeInputField.tsx` — Preference-Aware Input

New shared component wrapping `<input type="time">` with a `lang` attribute that forces the browser display format:

- `timeFormat === '24h'` → `lang="pt-BR"` (browsers render 24h)
- `timeFormat === '12h'` → `lang="en-US"` (browsers render AM/PM)

The underlying value always stays in `HH:mm` (24h) regardless of display. Accepts `value`, `onChange`, `disabled`, and `className` props.

### 4. Component Updates

| File | Change |
|---|---|
| `lib/time.ts` | Add `formatISOTime` and `formatHour` |
| `calendarUtils.ts` | Remove `formatISOTime` export |
| `hooks/useFormatTime.ts` | Create hook |
| `components/ui/TimeInputField.tsx` | Create component |
| `components/ui/TimeDisplay.tsx` | Use `useFormatTime` instead of direct `formatTime` import |
| `CalendarEventBlock.tsx` | Replace `formatISOTime` import with `useFormatTime().formatISOTime` |
| `CalendarMonthEvent.tsx` | Same |
| `AppointmentPopover.tsx` | Same |
| `CalendarWeekGrid.tsx` | Use `useFormatTime().formatHour` for hour labels |
| `CalendarDayGrid.tsx` | Same |
| `ScheduleCard.tsx` | Replace local `TimeInput` with `TimeInputField` |
| `ExceptionsCard.tsx` | Replace local `TimeField` internals with `TimeInputField` |
| `StepDateTime.tsx` | Wrap slot string with `useFormatTime().formatTime` |
| `StepConfirm.tsx` | Wrap `startTime` with `useFormatTime().formatTime` |

## Data Flow

```
User profile (API) → UserPreferencesProvider → useUserPreferences()
                                                      ↓
                                             useFormatTime() hook
                                           ↙        ↓          ↘
                               formatTime    formatISOTime    formatHour
                                   ↓               ↓               ↓
                             TimeDisplay    CalendarBlocks    CalendarLabels
                             StepConfirm    AppointmentPopover

TimeInputField ← useFormatTime().timeFormat → lang attribute → browser display
```

## Constraints

- All values sent to and received from the API remain in `HH:mm` or ISO format — only display changes.
- No server-side rendering concerns; all affected components are `'use client'`.
- `UserPreferencesProvider` must be an ancestor of all components using `useFormatTime` (already the case via the `(tenant)` layout).
