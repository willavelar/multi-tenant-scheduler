import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/dashboard', '/appointments']

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  // Extract subdomain: "clinica-demo.lvh.me:3000" → "clinica-demo"
  const parts = host.split('.')
  const slug = parts.length >= 2 ? parts[0] : null

  // Super admin: app.lvh.me/* → rewrite to /_admin/*
  if (slug === 'app') {
    const url = request.nextUrl.clone()
    const targetPath = url.pathname === '/' ? '/tenants' : url.pathname
    url.pathname = `/_admin${targetPath}`
    const reqHeaders = new Headers(request.headers)
    reqHeaders.set('x-is-superadmin', 'true')
    return NextResponse.rewrite(url, { request: { headers: reqHeaders } })
  }

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (isProtected) {
    const token = request.cookies.get('refreshToken')?.value
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Forward slug as a request header so Server Components can read it via headers()
  const requestHeaders = new Headers(request.headers)
  if (slug) {
    requestHeaders.set('x-tenant-slug', slug)
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
