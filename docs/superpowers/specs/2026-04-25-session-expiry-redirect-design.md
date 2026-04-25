# Session Expiry Redirect — Design Spec

**Date:** 2026-04-25
**Branch:** feat/admins-crud-user-preferences-shared-forms

## Problem

When the API returns 401 (token revogado ou expirado servidor) ou o JWT no localStorage está expirado no carregamento da página, o frontend não informa o usuário e não redireciona para o login. O usuário fica preso em uma tela com erro silencioso.

## Requirements

- Quando a API retornar 401, redirecionar para `/login` com mensagem "sessão expirada".
- Após re-login por expiração, retornar à URL onde o usuário estava.
- Logout manual não carrega `returnTo` — vai para `/login` limpo.
- Sem polling ou verificação proativa — apenas em resposta a interação do usuário.
- Token expirado detectado no load (client-side) segue o mesmo fluxo.

## Architecture

### Dois gatilhos

| Gatilho | Onde ocorre |
|---|---|
| API retorna `401` | `useApi` captura `ApiError(401)` |
| JWT expirado no localStorage | `AuthProvider` ao hidratar no mount |

Ambos chamam `auth.signalExpired()`.

### `signalExpired()` — novo método no `AuthContext`

1. Verifica `expiryFiredRef.current` — se `true`, retorna imediatamente (dedup).
2. Seta `expiryFiredRef.current = true` (sincrono, antes de qualquer await).
3. Chama `clearTokens()` + `localStorage.removeItem('userProfileOverride')`.
4. Seta `user: null`, `accessToken: null`.
5. Salva `window.location.pathname + window.location.search` em `sessionStorage` como `session.returnTo`.
6. Faz `window.location.replace('/login?reason=session_expired')` (full reload limpa TanStack Query cache).

### `useApi` — intercept 401

```ts
return (path, options) =>
  apiFetch(path, { slug, token: accessToken, ...options })
    .catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        signalExpired()
      }
      throw err  // re-throw para TanStack Query registrar o erro
    })
```

### `AuthProvider` — token expirado no load

```ts
// antes:
} catch {
  clearTokens()
}

// depois:
} catch {
  signalExpired()
}
```

### Login page — after login

Dois mecanismos de `returnTo` precisam ser suportados:

| Mecanismo | Como chega | Quando ocorre |
|---|---|---|
| Expiração client-side / 401 | `sessionStorage['session.returnTo']` | `signalExpired()` |
| Redirect server-side | URL param `?from=` | Middleware Next.js |

Prioridade: sessionStorage > URL param `?from=` > `/appointments`.

```ts
const storedReturnTo = sessionStorage.getItem('session.returnTo')
sessionStorage.removeItem('session.returnTo')
const urlFrom = searchParams.get('from')
const candidate = storedReturnTo ?? urlFrom ?? '/appointments'
const returnTo =
  candidate.startsWith('/') && !candidate.startsWith('//')
    ? candidate
    : '/appointments'
router.push(returnTo)
```

### Login page — banner de sessão expirada

Renderizado quando `searchParams.get('reason') === 'session_expired'`:

```
⚠️  Sua sessão expirou. Faça login para continuar.
```

Banner âmbar, acima do card de login, com ícone de aviso.

## Security

### Open redirect — dupla camada

- `sessionStorage` é origin-scoped: não pode ser escrito por outra origem.
- Validação obrigatória no login mesmo assim: `returnTo.startsWith('/') && !returnTo.startsWith('//')`.
- Previne `//evil.com` que browsers interpretam como URL absoluta.

### Deduplicação

- `expiryFiredRef` é `useRef<boolean>(false)` no `AuthProvider`.
- Múltiplos 401s concorrentes chamam `signalExpired()` mas apenas o primeiro executa.
- O ref é exclusivo do fluxo de expiração — `logout()` manual não o toca.

### Logout manual

- Chama `logout()` existente: limpa tokens, zera estado.
- **Não** salva `session.returnTo` no sessionStorage.
- Redireciona para `/login` sem `reason`.

### Middleware

O middleware Next.js (`middleware.ts`) permanece intocado. Ele protege server-side via cookie `refreshToken` e é uma camada independente.

## Files Changed

| Arquivo | Mudança |
|---|---|
| `packages/web/src/providers/AuthProvider.tsx` | Adiciona `expiryFiredRef`, `signalExpired()`, expõe no contexto |
| `packages/web/src/hooks/useApi.ts` | Captura `ApiError(401)`, chama `signalExpired()` |
| `packages/web/src/app/(tenant)/login/page.tsx` | Lê `session.returnTo` no submit, exibe banner âmbar |

Três arquivos. Sem novas dependências.

## Out of Scope

- Refresh token rotation (não existe na arquitetura atual).
- Notificação proativa de expiração iminente.
- Persistência de `returnTo` entre abas (sessionStorage é tab-scoped por design).
