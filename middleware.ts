/**
 * Unified CSRF Protection Middleware
 *
 * Combines features from sec-003 and sec-005:
 * - Automatic CSRF token generation for GET requests (sec-003)
 * - Enhanced error messages with codes and IP logging (sec-005)
 * - Development bypass flag (sec-005)
 * - Static asset handling (sec-003)
 * - Logger integration (sec-003)
 *
 * Protects API routes from Cross-Site Request Forgery attacks by:
 * 1. Generating and setting CSRF tokens on GET requests
 * 2. Validating tokens on unsafe methods (POST/PUT/PATCH/DELETE)
 * 3. Using double-submit cookie pattern for validation
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
 * Generate a random CSRF token
 */
function generateCsrfToken(): string {
  // Generate a random token using crypto API
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
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

  // For GET requests, ensure CSRF token exists in cookie (from sec-003)
  if (method === 'GET') {
    const existingToken = request.cookies.get('csrf-token')?.value

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

      logger.info('CSRF token generated', {
        pathname,
        method,
      })

      return response
    }

    return NextResponse.next()
  }

  // For unsafe methods, validate CSRF token
  if (UNSAFE_METHODS.includes(method)) {
    const cookieToken = request.cookies.get('csrf-token')?.value
    const headerToken = request.headers.get('x-csrf-token')

    // Enhanced logging with IP (from sec-005)
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

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
