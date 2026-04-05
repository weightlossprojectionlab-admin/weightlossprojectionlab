/**
 * Multi-Tenant Middleware
 *
 * Detects subdomain from hostname and passes it as a request header.
 * The TenantContext reads this header to load the correct tenant.
 *
 * Runs on Vercel Edge Runtime — no Firestore calls here.
 * Tenant data resolution happens in TenantContext (client-side).
 */

import { NextRequest, NextResponse } from 'next/server'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'wellnessprojectionlab.com'

function extractSubdomain(hostname: string): string | null {
  // Remove port for localhost
  const host = hostname.split(':')[0]

  // localhost development: use NEXT_PUBLIC_DEV_TENANT_SLUG env var
  // or subdomain.localhost pattern
  if (host === 'localhost' || host === '127.0.0.1') {
    return process.env.NEXT_PUBLIC_DEV_TENANT_SLUG || null
  }

  // Handle subdomain.localhost (e.g., gentletouch.localhost)
  if (host.endsWith('.localhost')) {
    return host.replace('.localhost', '') || null
  }

  // Production: extract subdomain from ROOT_DOMAIN
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = host.replace(`.${ROOT_DOMAIN}`, '')
    return subdomain || null
  }

  // Direct domain access (no subdomain)
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) {
    return null
  }

  return null
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = extractSubdomain(hostname)

  // No subdomain = marketing site or direct WPL access — pass through
  if (!subdomain || subdomain === 'www') {
    return NextResponse.next()
  }

  // Set tenant slug header for downstream components
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', subdomain)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  // Match all routes except static files, images, and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$).*)'],
}
