/**
 * Security Test Utilities
 *
 * Helper functions for security regression testing across all Sprint 1 & 2 fixes
 */

import { NextRequest } from 'next/server'

/**
 * Mock authenticated Firebase ID token
 */
export function mockAuthToken(customClaims: Record<string, any> = {}): string {
  // In tests, we'll mock the token verification, but return a realistic JWT structure
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64')
  const payload = Buffer.from(JSON.stringify({
    uid: customClaims.uid || 'test-user-123',
    email: customClaims.email || 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...customClaims
  })).toString('base64')
  const signature = 'mock-signature'
  return `${header}.${payload}.${signature}`
}

/**
 * Mock super admin authenticated token
 */
export function mockSuperAdminToken(): string {
  return mockAuthToken({
    uid: 'super-admin-uid',
    email: 'perriceconsulting@gmail.com',
    role: 'admin',
    admin: true,
    isSuperAdmin: true
  })
}

/**
 * Mock regular admin token
 */
export function mockAdminToken(): string {
  return mockAuthToken({
    uid: 'admin-uid',
    email: 'admin@example.com',
    role: 'admin',
    admin: true
  })
}

/**
 * Mock moderator token
 */
export function mockModeratorToken(): string {
  return mockAuthToken({
    uid: 'moderator-uid',
    email: 'moderator@example.com',
    role: 'moderator',
    moderator: true
  })
}

/**
 * Create mock authenticated request with Bearer token
 */
export function mockAuthenticatedRequest(
  url: string = 'http://localhost:3000/api/test',
  options: {
    method?: string
    token?: string
    body?: any
    headers?: Record<string, string>
    ip?: string
  } = {}
): NextRequest {
  const headers = new Headers({
    'authorization': `Bearer ${options.token || mockAuthToken()}`,
    'content-type': 'application/json',
    ...options.headers
  })

  const requestOptions: any = {
    method: options.method || 'GET',
    headers,
  }

  if (options.body) {
    requestOptions.body = JSON.stringify(options.body)
  }

  const request = new NextRequest(url, requestOptions)

  // Mock IP address if provided
  if (options.ip) {
    Object.defineProperty(request, 'ip', {
      value: options.ip,
      writable: false
    })
  }

  return request
}

/**
 * Mock production environment
 */
export function mockProductionEnv(): () => void {
  const originalEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'

  return () => {
    process.env.NODE_ENV = originalEnv
  }
}

/**
 * Mock development environment
 */
export function mockDevEnv(): () => void {
  const originalEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'development'

  return () => {
    process.env.NODE_ENV = originalEnv
  }
}

/**
 * Test rate limit exhaustion
 * Simulates multiple requests to exhaust rate limit
 */
export async function testRateLimitExhaustion(
  rateLimitFn: (request: NextRequest) => Promise<any>,
  limit: number,
  identifier: string = 'test-user'
): Promise<{
  allowedRequests: number
  blockedRequests: number
  lastResponse: any
}> {
  let allowedRequests = 0
  let blockedRequests = 0
  let lastResponse: any = null

  // Make requests until blocked
  for (let i = 0; i < limit + 5; i++) {
    const request = mockAuthenticatedRequest('http://localhost:3000/api/test', {
      ip: `192.168.1.${identifier}`
    })

    const response = await rateLimitFn(request)
    lastResponse = response

    if (!response || response.status !== 429) {
      allowedRequests++
    } else {
      blockedRequests++
    }
  }

  return {
    allowedRequests,
    blockedRequests,
    lastResponse
  }
}

/**
 * Assert security headers are present in response
 */
export function assertSecurityHeaders(
  headers: Headers | Map<string, string>,
  expectedHeaders: {
    csp?: boolean
    xFrameOptions?: boolean
    xContentTypeOptions?: boolean
    referrerPolicy?: boolean
  } = {
    csp: true,
    xFrameOptions: true,
    xContentTypeOptions: true,
    referrerPolicy: true
  }
): void {
  const getHeader = (name: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(name)
    } else if (headers instanceof Map) {
      return headers.get(name) || null
    }
    return null
  }

  if (expectedHeaders.csp) {
    const csp = getHeader('content-security-policy')
    if (!csp) {
      throw new Error('Missing Content-Security-Policy header')
    }
    // Verify it contains essential directives
    if (!csp.includes('default-src')) {
      throw new Error('CSP missing default-src directive')
    }
  }

  if (expectedHeaders.xFrameOptions) {
    const xfo = getHeader('x-frame-options')
    if (!xfo || !['DENY', 'SAMEORIGIN'].includes(xfo.toUpperCase())) {
      throw new Error('Missing or invalid X-Frame-Options header')
    }
  }

  if (expectedHeaders.xContentTypeOptions) {
    const xcto = getHeader('x-content-type-options')
    if (xcto !== 'nosniff') {
      throw new Error('Missing or invalid X-Content-Type-Options header')
    }
  }

  if (expectedHeaders.referrerPolicy) {
    const rp = getHeader('referrer-policy')
    if (!rp) {
      throw new Error('Missing Referrer-Policy header')
    }
  }
}

/**
 * Generate mock CSRF token
 */
export function mockCSRFToken(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

/**
 * Create request with CSRF token
 */
export function mockRequestWithCSRF(
  url: string,
  options: {
    method?: string
    token?: string
    csrfToken?: string
    body?: any
  } = {}
): NextRequest {
  const csrfToken = options.csrfToken || mockCSRFToken()

  return mockAuthenticatedRequest(url, {
    method: options.method || 'POST',
    token: options.token,
    body: options.body,
    headers: {
      'x-csrf-token': csrfToken,
      'cookie': `csrf-token=${csrfToken}; path=/; SameSite=Strict`
    }
  })
}

/**
 * Assert rate limit headers are present and valid
 */
export function assertRateLimitHeaders(
  headers: Headers | Map<string, string>
): void {
  const getHeader = (name: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(name)
    } else if (headers instanceof Map) {
      return headers.get(name) || null
    }
    return null
  }

  const limit = getHeader('x-ratelimit-limit')
  const remaining = getHeader('x-ratelimit-remaining')
  const reset = getHeader('x-ratelimit-reset')
  const retryAfter = getHeader('retry-after')

  if (!limit) throw new Error('Missing X-RateLimit-Limit header')
  if (!remaining) throw new Error('Missing X-RateLimit-Remaining header')
  if (!reset) throw new Error('Missing X-RateLimit-Reset header')
  if (!retryAfter) throw new Error('Missing Retry-After header')

  // Validate values are numbers
  if (isNaN(Number(limit))) throw new Error('X-RateLimit-Limit must be a number')
  if (isNaN(Number(remaining))) throw new Error('X-RateLimit-Remaining must be a number')
  if (isNaN(Number(reset))) throw new Error('X-RateLimit-Reset must be a number')
  if (isNaN(Number(retryAfter))) throw new Error('Retry-After must be a number')
}

/**
 * Mock Firebase Admin SDK for testing
 */
export function mockFirebaseAdmin() {
  return {
    auth: {
      verifyIdToken: jest.fn(async (token: string) => {
        // Decode mock token
        try {
          const payload = token.split('.')[1]
          const decoded = JSON.parse(Buffer.from(payload, 'base64').toString())
          return decoded
        } catch {
          throw new Error('Invalid token')
        }
      }),
      setCustomUserClaims: jest.fn(async () => ({})),
      getUser: jest.fn(async (uid: string) => ({
        uid,
        email: 'test@example.com',
        displayName: 'Test User'
      }))
    },
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(async () => ({
            exists: true,
            data: () => ({})
          })),
          set: jest.fn(async () => ({})),
          update: jest.fn(async () => ({}))
        }))
      }))
    }))
  }
}

/**
 * Create mock request with specific origin
 */
export function mockRequestWithOrigin(
  url: string,
  origin: string,
  options: {
    method?: string
    token?: string
  } = {}
): NextRequest {
  return mockAuthenticatedRequest(url, {
    ...options,
    headers: {
      'origin': origin
    }
  })
}

/**
 * SSRF attack test vectors
 */
export const SSRF_ATTACK_VECTORS = {
  // Private IP ranges
  privateIPs: [
    'http://127.0.0.1',
    'http://localhost',
    'http://0.0.0.0',
    'http://10.0.0.1',
    'http://192.168.1.1',
    'http://172.16.0.1',
    'http://169.254.169.254', // AWS metadata
  ],

  // Cloud metadata endpoints
  metadata: [
    'http://169.254.169.254/latest/meta-data/',
    'http://metadata.google.internal/computeMetadata/v1/',
    'http://169.254.169.254/metadata/instance',
  ],

  // Protocol smuggling
  protocols: [
    'file:///etc/passwd',
    'ftp://internal.server.com',
    'gopher://internal.server.com',
    'dict://internal.server.com:11211',
  ],

  // DNS rebinding attempts
  dnsRebinding: [
    'http://127.0.0.1.nip.io',
    'http://localtest.me',
    'http://customer1.app.localhost.my.company.127.0.0.1.nip.io',
  ]
}

/**
 * Wait for a specified time (for rate limit tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Cleanup function for tests
 */
export function cleanupTestEnvironment() {
  // Reset environment variables
  delete process.env.SUPER_ADMIN_EMAILS
  delete process.env.ALLOWED_ORIGINS
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN

  // Reset NODE_ENV to test
  process.env.NODE_ENV = 'test'
}
