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
  },
}))

// Mock API response helpers (if they exist)
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
}), { virtual: true })

// Mock URL validation (if it exists)
jest.mock('@/lib/url-validation', () => ({
  validateFetchURL: jest.fn(),
}), { virtual: true })

import { GET as fetchUrlHandler } from '@/app/api/fetch-url/route'
import { GET as debugProfileHandler } from '@/app/api/debug-profile/route'
import { POST as fixOnboardingHandler } from '@/app/api/fix-onboarding/route'
import { POST as fixStartWeightHandler } from '@/app/api/fix-start-weight/route'

describe('Debug Endpoints - Production Kill Switches', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    // Force production environment for these tests
    process.env.NODE_ENV = 'production'
  })

  afterEach(() => {
    // Restore original NODE_ENV after each test
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('GET /api/fetch-url', () => {
    it('should return 403 in production', async () => {
      const request = new NextRequest('http://localhost:3000/api/fetch-url?url=https://example.com')
      const response = await fetchUrlHandler(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Not available in production')
    })
  })

  describe('GET /api/debug-profile', () => {
    it('should return 403 in production', async () => {
      const request = new NextRequest('http://localhost:3000/api/debug-profile', {
        headers: {
          authorization: 'Bearer fake-token'
        }
      })
      const response = await debugProfileHandler(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Not available in production')
    })
  })

  describe('POST /api/fix-onboarding', () => {
    it('should return 403 in production', async () => {
      const request = new NextRequest('http://localhost:3000/api/fix-onboarding', {
        method: 'POST',
        headers: {
          authorization: 'Bearer fake-token'
        }
      })
      const response = await fixOnboardingHandler(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Not available in production')
    })
  })

  describe('POST /api/fix-start-weight', () => {
    it('should return 403 in production', async () => {
      const request = new NextRequest('http://localhost:3000/api/fix-start-weight', {
        method: 'POST',
        headers: {
          authorization: 'Bearer fake-token'
        }
      })
      const response = await fixStartWeightHandler(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Not available in production')
    })
  })

  describe('Non-production behavior verification', () => {
    beforeEach(() => {
      // Set to development for these tests
      process.env.NODE_ENV = 'development'
    })

    it('should allow /api/fetch-url in development', async () => {
      const request = new NextRequest('http://localhost:3000/api/fetch-url?url=invalid-url')
      const response = await fetchUrlHandler(request)

      // Should not return 403, but will return 400 for invalid URL
      expect(response.status).not.toBe(403)
    })

    it('should allow /api/debug-profile in development', async () => {
      const request = new NextRequest('http://localhost:3000/api/debug-profile')
      const response = await debugProfileHandler(request)

      // Should not return 403, but will return 401 for missing auth
      expect(response.status).not.toBe(403)
    })

    it('should allow /api/fix-onboarding in development', async () => {
      const request = new NextRequest('http://localhost:3000/api/fix-onboarding', {
        method: 'POST'
      })
      const response = await fixOnboardingHandler(request)

      // Should not return 403, but will return 401 for missing auth
      expect(response.status).not.toBe(403)
    })

    it('should allow /api/fix-start-weight in development', async () => {
      const request = new NextRequest('http://localhost:3000/api/fix-start-weight', {
        method: 'POST'
      })
      const response = await fixStartWeightHandler(request)

      // Should not return 403, but will return 401 for missing auth
      expect(response.status).not.toBe(403)
    })
  })
})
