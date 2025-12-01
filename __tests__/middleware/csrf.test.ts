/**
 * CSRF Middleware Tests (SEC-005)
 *
 * Comprehensive test suite for CSRF protection middleware
 * Tests double-submit cookie pattern validation
 */

/**
 * @jest-environment node
 */

// Polyfill Web APIs for Next.js middleware testing
import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream } from 'stream/web'

// @ts-ignore - Add web APIs to global
global.TextEncoder = TextEncoder
// @ts-ignore
global.TextDecoder = TextDecoder
// @ts-ignore
global.ReadableStream = ReadableStream

// Polyfill Request and Response
// @ts-ignore
global.Request = class Request {
  constructor(public url: string, public init?: any) {}
}
// @ts-ignore
global.Response = class Response {
  constructor(public body: any, public init?: any) {}
}

import { NextRequest } from 'next/server'
import { middleware } from '../../middleware'

/**
 * Helper to create mock NextRequest
 */
function createMockRequest(options: {
  url: string
  method?: string
  cookies?: Record<string, string>
  headers?: Record<string, string>
}): NextRequest {
  const { url, method = 'GET', cookies = {}, headers = {} } = options

  // Create request with proper Next.js structure
  const request = new NextRequest(url, {
    method,
    headers: new Headers(headers),
  })

  // Mock cookies (Next.js uses RequestCookies interface)
  // We need to override the cookies getter
  Object.defineProperty(request, 'cookies', {
    get: () => ({
      get: (name: string) => {
        const value = cookies[name]
        return value ? { name, value } : undefined
      },
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
      has: (name: string) => name in cookies,
    }),
  })

  return request
}

describe('CSRF Middleware (SEC-005)', () => {
  // Store original env
  const originalEnv = process.env.NODE_ENV
  const originalDisableCSRF = process.env.DISABLE_CSRF

  afterEach(() => {
    // Restore environment
    process.env.NODE_ENV = originalEnv
    process.env.DISABLE_CSRF = originalDisableCSRF
  })

  describe('Safe Methods (GET, HEAD, OPTIONS)', () => {
    it('allows GET requests without CSRF token', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'GET',
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('allows HEAD requests without CSRF token', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'HEAD',
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('allows OPTIONS requests without CSRF token', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'OPTIONS',
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })
  })

  describe('Unsafe Methods (POST, PUT, PATCH, DELETE)', () => {
    const validToken = 'abc123xyz789'

    it('blocks POST request with missing cookie token', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
        headers: { 'x-csrf-token': validToken },
      })

      const response = await middleware(request)
      expect(response.status).toBe(403)

      const body = await response.json()
      expect(body.code).toBe('CSRF_TOKEN_MISSING')
      expect(body.error).toContain('CSRF token missing')
    })

    it('blocks POST request with missing header token', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
        cookies: { 'csrf-token': validToken },
      })

      const response = await middleware(request)
      expect(response.status).toBe(403)

      const body = await response.json()
      expect(body.code).toBe('CSRF_TOKEN_MISSING')
    })

    it('blocks POST request with mismatched tokens', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
        cookies: { 'csrf-token': 'cookie-token' },
        headers: { 'x-csrf-token': 'different-token' },
      })

      const response = await middleware(request)
      expect(response.status).toBe(403)

      const body = await response.json()
      expect(body.code).toBe('CSRF_TOKEN_INVALID')
      expect(body.error).toContain('Invalid CSRF token')
    })

    it('allows POST request with matching tokens', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
        cookies: { 'csrf-token': validToken },
        headers: { 'x-csrf-token': validToken },
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('blocks PUT request with invalid token', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals/123',
        method: 'PUT',
        cookies: { 'csrf-token': 'token1' },
        headers: { 'x-csrf-token': 'token2' },
      })

      const response = await middleware(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.code).toBe('CSRF_TOKEN_INVALID')
    })

    it('allows PATCH request with valid token', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals/123',
        method: 'PATCH',
        cookies: { 'csrf-token': validToken },
        headers: { 'x-csrf-token': validToken },
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('allows DELETE request with valid token', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals/123',
        method: 'DELETE',
        cookies: { 'csrf-token': validToken },
        headers: { 'x-csrf-token': validToken },
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('blocks POST with empty string tokens', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
        cookies: { 'csrf-token': '' },
        headers: { 'x-csrf-token': '' },
      })

      const response = await middleware(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.code).toBe('CSRF_TOKEN_MISSING')
    })
  })

  describe('Bypass Patterns', () => {
    it('bypasses CSRF for /_next/ routes', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/_next/static/chunk.js',
        method: 'POST',
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('bypasses CSRF for /api/webhooks/stripe', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/webhooks/stripe',
        method: 'POST',
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('bypasses CSRF for /api/webhooks/sendgrid', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/webhooks/sendgrid',
        method: 'POST',
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('bypasses CSRF for /api/auth/webhook', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/auth/webhook',
        method: 'POST',
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('does NOT bypass regular auth endpoints', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/auth/login',
        method: 'POST',
      })

      const response = await middleware(request)
      expect(response.status).toBe(403)
    })
  })

  describe('Non-API Routes', () => {
    it('does not apply to non-API routes (homepage)', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/',
        method: 'POST',
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('does not apply to non-API routes (dashboard)', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/dashboard',
        method: 'POST',
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('does not apply to static assets', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/images/logo.png',
        method: 'GET',
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })
  })

  describe('Error Responses', () => {
    it('returns 403 with CSRF_TOKEN_MISSING code when cookie missing', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
        headers: { 'x-csrf-token': 'token' },
      })

      const response = await middleware(request)
      expect(response.status).toBe(403)

      const body = await response.json()
      expect(body).toEqual({
        error: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING',
        message: expect.stringContaining('required'),
      })
    })

    it('returns 403 with CSRF_TOKEN_MISSING code when header missing', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
        cookies: { 'csrf-token': 'token' },
      })

      const response = await middleware(request)
      expect(response.status).toBe(403)

      const body = await response.json()
      expect(body.code).toBe('CSRF_TOKEN_MISSING')
    })

    it('returns 403 with CSRF_TOKEN_INVALID code when tokens mismatch', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
        cookies: { 'csrf-token': 'cookie-value' },
        headers: { 'x-csrf-token': 'header-value' },
      })

      const response = await middleware(request)
      expect(response.status).toBe(403)

      const body = await response.json()
      expect(body).toEqual({
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
        message: expect.stringContaining('validation failed'),
      })
    })

    it('includes error message in response', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
      })

      const response = await middleware(request)
      const body = await response.json()

      expect(body.error).toBeDefined()
      expect(body.message).toBeDefined()
      expect(body.code).toBeDefined()
    })
  })

  describe('Development Bypass', () => {
    it('bypasses CSRF when DISABLE_CSRF=true in development', async () => {
      process.env.NODE_ENV = 'development'
      process.env.DISABLE_CSRF = 'true'

      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('does NOT bypass CSRF when DISABLE_CSRF=false in development', async () => {
      process.env.NODE_ENV = 'development'
      process.env.DISABLE_CSRF = 'false'

      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
      })

      const response = await middleware(request)
      expect(response.status).toBe(403)
    })

    it('does NOT bypass CSRF in production even with DISABLE_CSRF=true', async () => {
      process.env.NODE_ENV = 'production'
      process.env.DISABLE_CSRF = 'true'

      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
      })

      const response = await middleware(request)
      expect(response.status).toBe(403)
    })
  })

  describe('Edge Cases', () => {
    it('handles case-insensitive HTTP methods', async () => {
      const token = 'valid-token'
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'post', // lowercase
        cookies: { 'csrf-token': token },
        headers: { 'x-csrf-token': token },
      })

      const response = await middleware(request)
      // Should still validate (Next.js normalizes to uppercase)
      expect(response.status).not.toBe(403)
    })

    it('handles very long token values', async () => {
      const longToken = 'a'.repeat(1000)
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
        cookies: { 'csrf-token': longToken },
        headers: { 'x-csrf-token': longToken },
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('handles special characters in tokens', async () => {
      const specialToken = 'abc123-_+=/'
      const request = createMockRequest({
        url: 'http://localhost:3000/api/meals',
        method: 'POST',
        cookies: { 'csrf-token': specialToken },
        headers: { 'x-csrf-token': specialToken },
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })

    it('validates deep API routes', async () => {
      const token = 'valid-token'
      const request = createMockRequest({
        url: 'http://localhost:3000/api/patients/123/meals/456',
        method: 'DELETE',
        cookies: { 'csrf-token': token },
        headers: { 'x-csrf-token': token },
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(403)
    })
  })
})
