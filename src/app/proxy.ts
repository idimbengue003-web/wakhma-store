import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('wakhma_token')?.value
  const path = request.nextUrl.pathname

  // Public paths - always accessible
  if (
    path === '/' ||
    path.startsWith('/api/auth') ||
    path.startsWith('/_next') ||
    path.startsWith('/annonces') ||
    path.startsWith('/deposer') ||
    path.startsWith('/recharge') ||
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/api/demands') ||
    path.startsWith('/api/reveal') ||
    path.startsWith('/api/points') ||
    path.startsWith('/api/subscription') ||
    path.startsWith('/api/seed')
  ) {
    return NextResponse.next()
  }

  // No token - redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = verifyToken(token)
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('wakhma_token')
    return response
  }

  // Admin-only paths
  if (path.startsWith('/admin') && payload.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Pro-only paths
  if (path.startsWith('/pro') && payload.role !== 'pro' && payload.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
