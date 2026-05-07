# Dark/Light Mode — Design Spec

**Date:** 2026-05-06  
**Status:** Approved

## Overview

Add a persistent dark/light mode toggle to the entire application. The current design (light mode) becomes the default; dark mode is activated by the user or inferred from system preference.

## Decisions Made

- **Toggle style:** Single icon button — sun when in light mode, moon when in dark mode. Clicking switches modes.
- **Header placement:** Icon button to the left of the user dropdown on the right side of the header.
- **Login placement:** Icon button floating in the top-right corner of the login page.

## Architecture

### ThemeProvider (`providers/ThemeProvider.tsx`)

A custom React context — no external library. Responsibilities:

1. On mount: reads `localStorage.getItem('theme')`. If absent, falls back to `window.matchMedia('(prefers-color-scheme: dark)')`.
2. Applies/removes the `.dark` class on `document.documentElement`.
3. Exposes `{ theme: 'light' | 'dark', toggle: () => void }` via `useTheme()`.
4. On toggle: flips state, writes to `localStorage`, updates the class on `<html>`.

The `.dark` class is already wired in `globals.css` via `@custom-variant dark (&:is(.dark *))` — adding it to `<html>` activates all Tailwind dark variants across the entire tree.

### FOUC Prevention

A small inline blocking script tag in `app/layout.tsx` (inside `<head>`) reads `localStorage` and applies the `.dark` class before React hydrates. Without this, there is a visible flash of the wrong theme on page load. The script contains only a static string literal with no user input — there is no XSS risk. The `<html>` element gets `suppressHydrationWarning` because the class attribute changes between server and client render.

The script logic: read `localStorage['theme']`; if `'dark'`, or if absent and `prefers-color-scheme` is dark, add the `dark` class to `documentElement`. Wrapped in try/catch for environments that block localStorage.

### ThemeToggle (`components/ThemeToggle.tsx`)

A single client component:

- Calls `useTheme()` to get current theme and toggle function.
- Renders a 36x36px button with border and rounded corners.
- Shows the **sun icon** when `theme === 'light'` (clicking → dark).
- Shows the **moon icon** when `theme === 'dark'` (clicking → light).
- Uses semantic Tailwind classes so it adapts automatically: `bg-background border-border text-foreground hover:bg-accent`.

### globals.css Change

Update `:root` to shift `--background` from pure white to ~gray-50:

```css
:root {
  --background: oklch(0.97 0 0);  /* was oklch(1 0 0) — matches current gray-50 main area */
}
```

This preserves the current light mode visual (main content area is slightly gray, cards stand out as white `bg-card`). The `.dark` block stays unchanged.

## Semantic Color Mapping

New components should use semantic Tailwind tokens. Existing components updated as part of this work:

| Hardcoded class | Semantic replacement | Notes |
|---|---|---|
| `bg-white` (sidebar) | `bg-sidebar` | |
| `bg-white` (header, cards) | `bg-card` | Header uses bg-card |
| `bg-gray-50` (main content) | `bg-background` | Works after root change above |
| `text-gray-900` | `text-foreground` | |
| `text-gray-700` | `text-foreground` | |
| `text-gray-600` | `text-muted-foreground` | |
| `text-gray-500` | `text-muted-foreground` | |
| `text-gray-400` | `text-muted-foreground` | |
| `border-gray-200` | `border-border` | |
| `border-gray-100` | `border-border` | |
| `bg-gray-100` / `hover:bg-gray-100` | `bg-accent` / `hover:bg-accent` | |
| `bg-white` (dropdown) | `bg-popover` | |
| `text-gray-700` (dropdown items) | `text-popover-foreground` | |

Dark-mode-specific overrides via `dark:` prefix are used only where semantic tokens are insufficient, e.g. the active sidebar item uses `bg-indigo-50 text-indigo-600` in light and needs `dark:bg-indigo-950 dark:text-indigo-400`.

## Files Modified

| File | Change |
|---|---|
| `providers/ThemeProvider.tsx` | New — ThemeProvider + useTheme |
| `components/ThemeToggle.tsx` | New — sun/moon toggle button |
| `app/layout.tsx` | Wrap with ThemeProvider, add FOUC script, add suppressHydrationWarning to html |
| `app/globals.css` | Change `:root --background` to `oklch(0.97 0 0)` |
| `components/AppShell/Header.tsx` | Semantic colors + ThemeToggle left of user dropdown |
| `components/AppShell/Sidebar.tsx` | Semantic colors throughout |
| `components/AppShell/index.tsx` | main uses bg-background instead of bg-gray-50 |
| `app/(tenant)/login/page.tsx` | ThemeToggle top-right corner + semantic colors |

## Out of Scope

- Per-user theme persistence in the database (this is client-only via localStorage).
- Animations/transitions between themes beyond what Tailwind provides by default.
- A "system" option in the UI (system preference is only used as the initial fallback).
