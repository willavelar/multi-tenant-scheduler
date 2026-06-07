'use client'

import { useEffect } from 'react'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'TimoUp'

/**
 * Keeps the document `<title>` in sync with the page breadcrumbs.
 *
 * The crumbs are reversed (deepest page first), joined by " | ", and the site
 * name is appended after a hyphen. Mirrors the breadcrumb shown in the header.
 *
 *   crumbs: [Usuários, Editar usuário]  ->  "Editar usuário | Usuários - TimoUp"
 *   crumbs: [Agendamentos]              ->  "Agendamentos - TimoUp"
 *
 * When there are no meaningful crumbs (or the only crumb is the app name itself,
 * e.g. the unknown-route fallback), the bare app name is used.
 */
export function usePageTitle(crumbs: { label: string }[]) {
  const prefix = crumbs.map((c) => c.label).reverse().join(' | ')
  const title = !prefix || prefix === APP_NAME ? APP_NAME : `${prefix} - ${APP_NAME}`

  useEffect(() => {
    document.title = title
  }, [title])
}
