import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const subdomain = host.split('.')[0]

  if (subdomain === 'app') {
    const url = request.nextUrl.clone()
    const pathname = url.pathname

    // Public static files (e.g. /logo-default.png) must be served as-is,
    // not rewritten under /admin.
    if (/\.[^/]+$/.test(pathname)) {
      return NextResponse.next()
    }

    // Already under /admin — don't double-rewrite
    if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname === '/' ? '/tenants' : pathname}`
    }

    const res = NextResponse.rewrite(url)
    res.headers.set('x-super-admin', 'true')
    return res
  }

  // Regular tenant subdomain — forward slug
  const slug = host.split(':')[0].split('.')[0]
  const res = NextResponse.next()
  res.headers.set('x-tenant-slug', slug)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
