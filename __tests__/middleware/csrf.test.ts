/**
 * CSRF Middleware Tests
 *
 * Tests CSRF protection middleware to ensure:
 * - Static assets are not blocked
 * - Webhooks are not blocked by CSRF
 * - API POST without CSRF token returns 403
 * - API POST with matching cookie + header succeeds
 *
 * @jest-environment node
 */

import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '../../middleware'

// Mock logger to prevent console output during tests
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock crypto.getRandomValues for Node environment
if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
  global.crypto = {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
  } as Crypto
}

describe('CSRF Middleware', () => {
  describe('Static Assets Bypass', () => {
    it('should not block /_next/static/ requests', async () => {
      const request = new NextRequest('http://localhost:3000/_next/static/chunks/main.js', {
        method: 'GET',
      })

      const response = await middleware(request)

      // Should pass through (NextResponse.next() returns undefined in tests)
      expect(response).toBeDefined()
      // If it's a NextResponse, check it's not an error
      if (response instanceof NextResponse) {
        expect(response.status).not.toBe(403)
      }
    })

    it('should not block requests for .ico files', async () => {
      const request = new NextRequest('http://localhost:3000/favicon.ico', {
        method: 'GET',
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).not.toBe(403)
      }
    })

    it('should not block requests for .png files', async () => {
      const request = new NextRequest('http://localhost:3000/images/logo.png', {
        method: 'GET',
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).not.toBe(403)
      }
    })

    it('should not block requests for .svg files', async () => {
      const request = new NextRequest('http://localhost:3000/icons/check.svg', {
        method: 'GET',
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).not.toBe(403)
      }
    })
  })

  describe('Webhook Bypass', () => {
    it('should not block POST to /api/webhooks/stripe', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test-signature',
        },
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      // Should pass through without CSRF check
      if (response instanceof NextResponse) {
        expect(response.status).not.toBe(403)
      }
    })

    it('should not block POST to /api/webhooks/sendgrid', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/sendgrid', {
        method: 'POST',
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).not.toBe(403)
      }
    })
  })

  describe('CSRF Token Validation', () => {
    it('should set csrf-token cookie on GET request without token', async () => {
      const request = new NextRequest('http://localhost:3000/api/user-profile', {
        method: 'GET',
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        const setCookie = response.headers.get('set-cookie')
        // Should set csrf-token cookie
        expect(setCookie).toBeTruthy()
        if (setCookie) {
          expect(setCookie).toContain('csrf-token=')
        }
      }
    })

    it('should pass through GET request with existing token', async () => {
      const request = new NextRequest('http://localhost:3000/api/user-profile', {
        method: 'GET',
        headers: {
          cookie: 'csrf-token=existing-token-123',
        },
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).not.toBe(403)
      }
    })

    it('should block POST without CSRF token', async () => {
      const request = new NextRequest('http://localhost:3000/api/user-profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test User' }),
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).toBe(403)
        const json = await response.json()
        expect(json.error).toBe('Invalid CSRF token')
      }
    })

    it('should block POST with cookie but no header', async () => {
      const request = new NextRequest('http://localhost:3000/api/user-profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'csrf-token=test-token-123',
        },
        body: JSON.stringify({ name: 'Test User' }),
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).toBe(403)
        const json = await response.json()
        expect(json.error).toBe('Invalid CSRF token')
      }
    })

    it('should block POST with header but no cookie', async () => {
      const request = new NextRequest('http://localhost:3000/api/user-profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'test-token-123',
        },
        body: JSON.stringify({ name: 'Test User' }),
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).toBe(403)
        const json = await response.json()
        expect(json.error).toBe('Invalid CSRF token')
      }
    })

    it('should block POST with mismatched tokens', async () => {
      const request = new NextRequest('http://localhost:3000/api/user-profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'token-abc',
          cookie: 'csrf-token=token-xyz',
        },
        body: JSON.stringify({ name: 'Test User' }),
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).toBe(403)
        const json = await response.json()
        expect(json.error).toBe('Invalid CSRF token')
      }
    })

    it('should allow POST with matching cookie and header', async () => {
      const token = 'valid-csrf-token-123'
      const request = new NextRequest('http://localhost:3000/api/user-profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
          cookie: `csrf-token=${token}`,
        },
        body: JSON.stringify({ name: 'Test User' }),
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        // Should pass CSRF check (not 403)
        expect(response.status).not.toBe(403)
      }
    })

    it('should allow PUT with matching tokens', async () => {
      const token = 'valid-csrf-token-456'
      const request = new NextRequest('http://localhost:3000/api/user-profile', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
          cookie: `csrf-token=${token}`,
        },
        body: JSON.stringify({ name: 'Updated User' }),
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).not.toBe(403)
      }
    })

    it('should allow PATCH with matching tokens', async () => {
      const token = 'valid-csrf-token-789'
      const request = new NextRequest('http://localhost:3000/api/user-profile', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
          cookie: `csrf-token=${token}`,
        },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).not.toBe(403)
      }
    })

    it('should allow DELETE with matching tokens', async () => {
      const token = 'valid-csrf-token-000'
      const request = new NextRequest('http://localhost:3000/api/user-profile', {
        method: 'DELETE',
        headers: {
          'x-csrf-token': token,
          cookie: `csrf-token=${token}`,
        },
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).not.toBe(403)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple cookies correctly', async () => {
      const token = 'correct-token'
      const request = new NextRequest('http://localhost:3000/api/user-profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': token,
          cookie: `session=abc123; csrf-token=${token}; other=value`,
        },
        body: JSON.stringify({ name: 'Test' }),
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).not.toBe(403)
      }
    })

    it('should be case-insensitive for method checking', async () => {
      const request = new NextRequest('http://localhost:3000/api/user-profile', {
        method: 'post', // lowercase
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test' }),
      })

      const response = await middleware(request)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        // Should still require CSRF for lowercase 'post'
        expect(response.status).toBe(403)
      }
    })
  })
})
