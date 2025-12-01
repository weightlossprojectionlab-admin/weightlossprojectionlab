import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * CSRF Protection Middleware (SEC-005)
 * Validates CSRF tokens for unsafe HTTP methods using double-submit cookie pattern.
 */

const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

const BYPASS_PATTERNS = [
  /^\/_next\//,
  /^\/api\/webhooks\//,
  /^\/api\/auth\/webhook$/,
]

const isDevelopmentBypass = process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isDevelopmentBypass) {
    console.warn('[CSRF] Protection disabled via DISABLE_CSRF flag (development only)')
    return NextResponse.next()
  }

  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  for (const pattern of BYPASS_PATTERNS) {
    if (pattern.test(pathname)) {
      return NextResponse.next()
    }
  }

  if (!UNSAFE_METHODS.includes(request.method)) {
    return NextResponse.next()
  }

  const cookieToken = request.cookies.get('csrf-token')?.value
  const headerToken = request.headers.get('x-csrf-token')

  if (!cookieToken || !headerToken) {
    console.warn('[CSRF] Token missing:', {
      path: pathname,
      method: request.method,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    })

    return NextResponse.json(
      {
        error: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING',
        message: 'Cross-Site Request Forgery token is required for this request',
      },
      { status: 403 }
    )
  }

  if (cookieToken !== headerToken) {
    console.warn('[CSRF] Token mismatch:', {
      path: pathname,
      method: request.method,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    })

    return NextResponse.json(
      {
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
        message: 'Cross-Site Request Forgery token validation failed',
      },
      { status: 403 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
