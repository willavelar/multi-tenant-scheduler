import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/dashboard', '/appointments']

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  // Extract subdomain: "clinica-demo.lvh.me:3000" → "clinica-demo"
  const parts = host.split('.')
  const slug = parts.length >= 2 ? parts[0] : null

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

  const response = NextResponse.next()
  if (slug) {
    response.headers.set('x-tenant-slug', slug)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
