/**
 * CSRF Protection Middleware
 *
 * Validates CSRF tokens for unsafe HTTP methods (POST/PUT/PATCH/DELETE) using
 * the double-submit cookie pattern.
 *
 * Token Generation:
 * - Client-side generates and sets CSRF tokens via lib/csrf.ts
 * - Tokens are stored in non-httpOnly cookies so JS can read them
 * - Middleware only validates tokens, does not generate them
 *
 * Token Validation:
 * - Requires both cookie AND X-CSRF-Token header to be present
 * - Both values must match exactly
 * - Protected by SameSite: strict and Secure (in production)
 *
 * Bypasses:
 * - Static assets (/_next/*, *.ico, *.png, etc.)
 * - Webhooks (/api/webhooks/*, /api/auth/webhook)
 * - Safe methods (GET, HEAD, OPTIONS)
 * - Development mode with DISABLE_CSRF=true
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
  /^\/_next\//,              // Next.js static assets
  /^\/api\/webhooks\//,      // Webhook endpoints (e.g., Stripe)
  /^\/api\/auth\/webhook$/,  // Auth webhooks
]

// Development bypass flag
const isDevelopmentBypass = process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true'

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
 * Main middleware function
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Development bypass (from sec-005)
  if (isDevelopmentBypass) {
    console.warn('[CSRF] Protection disabled via DISABLE_CSRF flag (development only)')
    return NextResponse.next()
  }

  // Bypass CSRF for certain paths and static assets (from sec-003)
  if (shouldBypassCsrf(pathname)) {
    return NextResponse.next()
  }

  // Only apply to API routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // For GET requests, just pass through - client-side will generate token if needed
  // The client-side csrf.ts module handles token generation and cookie setting
  if (method === 'GET') {
    return NextResponse.next()
  }

  // Bypass CSRF for requests with Firebase Authorization bearer tokens
  // These are already authenticated via Firebase Admin SDK in the API routes
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return NextResponse.next()
  }

  // For unsafe methods, validate CSRF token
  if (UNSAFE_METHODS.includes(method)) {
    // Support both csrf_token (underscore) and csrf-token (hyphen) for compatibility
    const cookieToken = request.cookies.get('csrf_token')?.value || request.cookies.get('csrf-token')?.value
    const headerToken = request.headers.get('x-csrf-token')

    // Enhanced logging with IP (from sec-005)
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    // Debug logging with full details
    console.log('[CSRF Middleware] Validation attempt:', {
      pathname,
      method,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
      cookieLength: cookieToken?.length,
      headerLength: headerToken?.length,
      cookieToken: cookieToken,
      headerToken: headerToken,
      tokensMatch: cookieToken === headerToken,
      allCookies: request.cookies.getAll(),
      allHeaders: Object.fromEntries(request.headers.entries())
    })

    // Check if both tokens exist
    if (!cookieToken || !headerToken) {
      logger.warn('CSRF token missing', {
        pathname,
        method,
        hasCookie: !!cookieToken,
        hasHeader: !!headerToken,
        ip: clientIp,
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

    // Check if tokens match
    if (cookieToken !== headerToken) {
      logger.warn('CSRF token mismatch', {
        pathname,
        method,
        tokensMatch: false,
        cookieToken: cookieToken?.substring(0, 10) + '...',
        headerToken: headerToken?.substring(0, 10) + '...',
        ip: clientIp,
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

    // CSRF validation successful
    logger.debug('CSRF token validated', {
      pathname,
      method,
    })
  }

  return NextResponse.next()
}

// Apply middleware only to API routes
export const config = {
  matcher: '/api/:path*',
}
