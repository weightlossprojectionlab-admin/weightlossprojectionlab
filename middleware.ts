import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * CSRF Protection Middleware (SEC-005)
 *
 * Validates CSRF tokens for unsafe HTTP methods (POST, PUT, PATCH, DELETE).
 * Uses double-submit cookie pattern for stateless CSRF protection.
 *
 * Security Model:
 * - Client sends token in both cookie and X-CSRF-Token header
 * - Middleware validates that both tokens exist and match
 * - SameSite=Strict cookie prevents cross-site token submission
 * - Only applies to API routes
 *
 * Bypass Patterns:
 * - Next.js internal routes (/_next/)
 * - Webhook endpoints (validated via signature instead)
 * - Auth endpoints (may need special handling)
 * - Safe HTTP methods (GET, HEAD, OPTIONS)
 */

// HTTP methods that require CSRF protection
const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

/**
 * Route patterns that bypass CSRF validation
 *
 * Webhooks: External services (Stripe, SendGrid, etc.) cannot send CSRF tokens.
 * These endpoints MUST validate requests via webhook signatures instead.
 *
 * Auth: Login/signup endpoints may need bypass if token is generated after auth.
 * Consider generating CSRF token on page load for better security.
 *
 * Next.js internals: Framework routes for hot reload, static assets, etc.
 */
const BYPASS_PATTERNS = [
  /^\/_next\//,              // Next.js internal routes (HMR, static files)
  /^\/api\/webhooks\//,      // Webhook endpoints (Stripe, SendGrid, etc.)
  /^\/api\/auth\/webhook$/,  // Auth webhook endpoint
]

/**
 * Development bypass flag
 * Set DISABLE_CSRF=true in development to temporarily disable CSRF for testing
 * NEVER enable this in production!
 */
const isDevelopmentBypass = process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true'

/**
 * CSRF validation middleware
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Development bypass (if enabled)
  if (isDevelopmentBypass) {
    console.warn('[CSRF] Protection disabled via DISABLE_CSRF flag (development only)')
    return NextResponse.next()
  }

  // Only apply to API routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Check bypass patterns
  for (const pattern of BYPASS_PATTERNS) {
    if (pattern.test(pathname)) {
      return NextResponse.next()
    }
  }

  // Only validate unsafe HTTP methods
  if (!UNSAFE_METHODS.includes(request.method)) {
    return NextResponse.next()
  }

  // Get CSRF tokens from cookie and header
  const cookieToken = request.cookies.get('csrf-token')?.value
  const headerToken = request.headers.get('x-csrf-token')

  // Validate both tokens exist
  if (!cookieToken || !headerToken) {
    console.warn('[CSRF] Token missing:', {
      path: pathname,
      method: request.method,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
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

  // Validate tokens match (timing-safe comparison would be ideal, but string comparison is acceptable)
  if (cookieToken !== headerToken) {
    console.warn('[CSRF] Token mismatch:', {
      path: pathname,
      method: request.method,
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
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

  // Token validation successful
  return NextResponse.next()
}

/**
 * Middleware configuration
 * Only run on API routes for performance
 */
export const config = {
  matcher: '/api/:path*',
}
