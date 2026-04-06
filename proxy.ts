/**
 * CSRF Protection Proxy (Next.js 16+)
 * Previously middleware.ts - renamed to proxy.ts per Next.js 16 convention
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

// ============================================
// MULTI-TENANT SUBDOMAIN DETECTION
// ============================================
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'wellnessprojectionlab.com'

function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0]
  if (host === 'localhost' || host === '127.0.0.1') {
    return process.env.NEXT_PUBLIC_DEV_TENANT_SLUG || null
  }
  if (host.endsWith('.localhost')) {
    return host.replace('.localhost', '') || null
  }
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = host.replace(`.${ROOT_DOMAIN}`, '')
    return subdomain && subdomain !== 'www' ? subdomain : null
  }
  return null
}

// ============================================
// CSRF PROTECTION
// ============================================

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
 * Main proxy function (Next.js 16+ pattern — replaces middleware)
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Detect tenant subdomain and inject header for all requests
  const hostname = request.headers.get('host') || ''
  const tenantSlug = extractSubdomain(hostname)
  if (tenantSlug) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-tenant-slug', tenantSlug)

    // Apex-only routes: admin, login, and API stay on the apex marketing app
    // even when reached via a tenant subdomain. They get the header but no rewrite.
    const isApexOnlyRoute =
      pathname.startsWith('/api') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/franchise') ||
      pathname.startsWith('/franchise-agreement') ||
      pathname.startsWith('/baa') ||
      pathname.startsWith('/data-policy') ||
      pathname.startsWith('/tenant-shell') // prevent rewrite loops

    if (!isApexOnlyRoute) {
      // Internal rewrite to the tenant route group. URL bar stays {slug}.domain/path.
      const url = request.nextUrl.clone()
      url.pathname = `/tenant-shell${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    }

    // Apex-only path on a tenant subdomain — pass through with header attached
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/franchise') ||
      pathname.startsWith('/franchise-agreement') ||
      pathname.startsWith('/baa') ||
      pathname.startsWith('/data-policy')
    ) {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
  }

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

  // For unsafe methods, validate CSRF token
  // Note: Bearer token authentication does NOT bypass CSRF protection
  // CSRF protection is independent of authentication and protects against
  // cross-site request forgery attacks even with valid credentials
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

// Apply to all routes (subdomain detection needs all, CSRF only checks /api)
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$).*)'],
}
