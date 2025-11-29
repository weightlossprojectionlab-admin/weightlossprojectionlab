/**
 * CSRF Protection Middleware
 *
 * Protects API routes from Cross-Site Request Forgery attacks by requiring
 * a matching CSRF token in cookie and header for unsafe methods (POST/PUT/PATCH/DELETE).
 *
 * Bypasses:
 * - Static assets (/_next/*, *.ico, *.png, etc.)
 * - Webhooks (/api/webhooks/*)
 * - Safe methods (GET, HEAD, OPTIONS)
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Unsafe HTTP methods that require CSRF protection
const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

// File extensions that should bypass CSRF (static assets)
const STATIC_EXTENSIONS = [
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.gif',
  '.webp',
  '.css',
  '.js',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
]

// Paths that should bypass CSRF protection
const BYPASS_PATTERNS = [
  /^\/_next\//,           // Next.js static assets
  /^\/api\/webhooks\//,   // Webhook endpoints (e.g., Stripe)
]

/**
 * Check if request should bypass CSRF protection
 */
function shouldBypassCsrf(pathname: string): boolean {
  // Check static extensions
  if (STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
    return true
  }

  // Check bypass patterns
  if (BYPASS_PATTERNS.some(pattern => pattern.test(pathname))) {
    return true
  }

  return false
}

/**
 * Generate a random CSRF token
 */
function generateCsrfToken(): string {
  // Generate a random token using crypto API
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Get CSRF token from cookie
 */
function getCsrfTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get('csrf-token')?.value ?? null
}

/**
 * Get CSRF token from header
 */
function getCsrfTokenFromHeader(request: NextRequest): string | null {
  return request.headers.get('x-csrf-token') ?? null
}

/**
 * Main middleware function
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Bypass CSRF for certain paths and static assets
  if (shouldBypassCsrf(pathname)) {
    return NextResponse.next()
  }

  // For GET requests, ensure CSRF token exists in cookie
  if (method === 'GET') {
    const existingToken = getCsrfTokenFromCookie(request)

    if (!existingToken) {
      // Generate new token and set cookie
      const token = generateCsrfToken()
      const response = NextResponse.next()
      response.cookies.set('csrf-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
      return response
    }

    return NextResponse.next()
  }

  // For unsafe methods, validate CSRF token
  if (UNSAFE_METHODS.includes(method)) {
    const cookieToken = getCsrfTokenFromCookie(request)
    const headerToken = getCsrfTokenFromHeader(request)

    // Check if both tokens exist and match
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      logger.warn('CSRF token validation failed', {
        pathname,
        method,
        hasCookie: !!cookieToken,
        hasHeader: !!headerToken,
        tokensMatch: cookieToken === headerToken,
      })

      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }
  }

  return NextResponse.next()
}

// Apply middleware only to API routes
export const config = {
  matcher: '/api/:path*',
}
