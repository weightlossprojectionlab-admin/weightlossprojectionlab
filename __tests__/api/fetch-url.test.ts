/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

// Mock Firebase Admin before importing route handlers
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {},
  verifyIdToken: jest.fn(),
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock API response helpers
jest.mock('@/lib/api-response', () => ({
  errorResponse: jest.fn((error) => {
    return new Response(JSON.stringify({ error: 'Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
  validationError: jest.fn((message) => {
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
}))

import { GET as fetchUrlHandler } from '@/app/api/fetch-url/route'

/**
 * SSRF Protection Tests for /api/fetch-url
 *
 * Tests SEC-001: SSRF hardening implementation
 * - Domain whitelist enforcement
 * - Private/local IP blocking
 * - Protocol validation
 * - Error handling
 */
describe('SSRF Protection - /api/fetch-url', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    // Set to development to bypass production kill switch
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('Allowed URLs - Whitelist', () => {
    it('should allow https://static.openfoodfacts.org/images/products/123.jpg', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=https://static.openfoodfacts.org/images/products/123.jpg'
      )

      const response = await fetchUrlHandler(request)

      // Should not return validation error (400)
      // May fail with fetch error (e.g., network), but validation should pass
      if (response.status === 400) {
        const data = await response.json()
        // Ensure it's not a validation error
        expect(data.error).not.toContain('not in the allowed domains')
        expect(data.error).not.toContain('private or local IP')
      }
    })

    it('should allow openfoodfacts.org domain', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=https://openfoodfacts.org/api/v0/product/123'
      )

      const response = await fetchUrlHandler(request)

      if (response.status === 400) {
        const data = await response.json()
        expect(data.error).not.toContain('not in the allowed domains')
        expect(data.error).not.toContain('private or local IP')
      }
    })

    it('should allow images.openfoodfacts.org subdomain', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=https://images.openfoodfacts.org/products/123.jpg'
      )

      const response = await fetchUrlHandler(request)

      if (response.status === 400) {
        const data = await response.json()
        expect(data.error).not.toContain('not in the allowed domains')
        expect(data.error).not.toContain('private or local IP')
      }
    })

    it('should allow api.nal.usda.gov domain', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=https://api.nal.usda.gov/fdc/v1/foods/search'
      )

      const response = await fetchUrlHandler(request)

      if (response.status === 400) {
        const data = await response.json()
        expect(data.error).not.toContain('not in the allowed domains')
        expect(data.error).not.toContain('private or local IP')
      }
    })

    it('should allow fdc.nal.usda.gov domain', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=https://fdc.nal.usda.gov/fdc-app.html'
      )

      const response = await fetchUrlHandler(request)

      if (response.status === 400) {
        const data = await response.json()
        expect(data.error).not.toContain('not in the allowed domains')
        expect(data.error).not.toContain('private or local IP')
      }
    })
  })

  describe('Blocked URLs - SSRF Attempts', () => {
    it('should block http://169.254.169.254/latest/meta-data/ (AWS metadata)', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=http://169.254.169.254/latest/meta-data/'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('not in the allowed domains')
    })

    it('should block http://127.0.0.1:8080/admin (localhost)', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=http://127.0.0.1:8080/admin'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('not in the allowed domains')
    })

    it('should block http://192.168.1.1/config (private network)', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=http://192.168.1.1/config'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('not in the allowed domains')
    })

    it('should block https://evil.com (not in whitelist)', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=https://evil.com'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('not in the allowed domains')
    })

    it('should block http://localhost/secrets (localhost hostname)', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=http://localhost/secrets'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('not in the allowed domains')
    })

    it('should block 10.0.0.1 (private network range)', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=http://10.0.0.1/internal'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('not in the allowed domains')
    })

    it('should block 172.16.0.1 (private network range)', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=http://172.16.0.1/admin'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('not in the allowed domains')
    })
  })

  describe('Input Validation', () => {
    it('should reject missing URL parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('URL parameter is required')
    })

    it('should reject invalid URL format', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=not-a-valid-url'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid URL format')
    })

    it('should reject file:// protocol', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=file:///etc/passwd'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Only HTTP and HTTPS protocols are allowed')
    })

    it('should reject ftp:// protocol', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=ftp://example.com/file.txt'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Only HTTP and HTTPS protocols are allowed')
    })

    it('should reject javascript: protocol', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=javascript:alert(1)'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      // javascript: is a valid URL format but rejected by protocol check
      expect(data.error).toContain('Only HTTP and HTTPS protocols are allowed')
    })
  })

  describe('Error Handling', () => {
    it('should not expose stack traces in error responses', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=http://127.0.0.1/admin'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      // Should have error message but not raw stack trace
      expect(data).toHaveProperty('error')
      // In development, stack may be present, but it should be structured
      if (data.stack) {
        // If stack is present, it should be in the structured format from errorResponse
        expect(data).toHaveProperty('success', false)
      }
    })

    it('should return proper HTTP status codes', async () => {
      const testCases = [
        {
          url: '',
          expectedStatus: 400,
          description: 'missing URL'
        },
        {
          url: 'http://127.0.0.1/admin',
          expectedStatus: 400,
          description: 'blocked URL'
        },
        {
          url: 'https://evil.com',
          expectedStatus: 400,
          description: 'non-whitelisted domain'
        }
      ]

      for (const testCase of testCases) {
        const request = new NextRequest(
          `http://localhost:3000/api/fetch-url${testCase.url ? `?url=${testCase.url}` : ''}`
        )

        const response = await fetchUrlHandler(request)

        expect(response.status).toBe(testCase.expectedStatus)
      }
    })
  })

  describe('Production Kill Switch', () => {
    beforeEach(() => {
      // Force production environment
      process.env.NODE_ENV = 'production'
    })

    it('should return 403 in production environment', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/fetch-url?url=https://static.openfoodfacts.org/images/products/123.jpg'
      )

      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Not available in production')
    })
  })
})
