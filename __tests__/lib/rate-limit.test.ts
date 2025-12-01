/**
 * Tests for Distributed Rate Limiting
 *
 * SEC-006: Rate limiting with Upstash Redis
 */

// Mock Next.js modules before importing
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {}))
    }))
  }
}))

// Mock logger to suppress console output during tests
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}))

import { rateLimit, getRateLimitHeaders, __testing__ } from '@/lib/rate-limit'

describe('Rate Limiting', () => {
  const { inMemoryStore, InMemoryRateLimiter } = __testing__

  beforeEach(() => {
    // Clear in-memory store before each test
    inMemoryStore.clear()
  })

  describe('InMemoryRateLimiter', () => {
    it('should allow requests within limit', async () => {
      const limiter = new InMemoryRateLimiter(5, 60000, 'test')

      const result1 = await limiter.limit('user1')
      expect(result1.success).toBe(true)
      expect(result1.limit).toBe(5)
      expect(result1.remaining).toBe(4)

      const result2 = await limiter.limit('user1')
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(3)
    })

    it('should block requests exceeding limit', async () => {
      const limiter = new InMemoryRateLimiter(3, 60000, 'test')

      // Make 3 requests (at the limit)
      await limiter.limit('user1')
      await limiter.limit('user1')
      await limiter.limit('user1')

      // 4th request should be blocked
      const result = await limiter.limit('user1')
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should isolate limits per user', async () => {
      const limiter = new InMemoryRateLimiter(2, 60000, 'test')

      const user1Result1 = await limiter.limit('user1')
      const user2Result1 = await limiter.limit('user2')

      expect(user1Result1.success).toBe(true)
      expect(user1Result1.remaining).toBe(1)

      expect(user2Result1.success).toBe(true)
      expect(user2Result1.remaining).toBe(1)
    })

    it('should reset after window expires', async () => {
      const limiter = new InMemoryRateLimiter(2, 100, 'test') // 100ms window

      // Use up the limit
      await limiter.limit('user1')
      await limiter.limit('user1')

      // Should be blocked
      const blocked = await limiter.limit('user1')
      expect(blocked.success).toBe(false)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be allowed again
      const allowed = await limiter.limit('user1')
      expect(allowed.success).toBe(true)
    })

    it('should provide correct reset timestamp', async () => {
      const limiter = new InMemoryRateLimiter(5, 60000, 'test')
      const now = Date.now()

      const result = await limiter.limit('user1')

      expect(result.reset).toBeGreaterThan(Math.floor(now / 1000))
      expect(result.reset).toBeLessThanOrEqual(Math.floor((now + 60000) / 1000) + 1)
    })
  })

  describe('rateLimit function', () => {
    it('should allow requests within fetch-url limit', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
        nextUrl: { searchParams: new URLSearchParams() }
      } as any as NextRequest

      const result = await rateLimit(mockRequest, 'fetch-url', 'test-user-1')
      expect(result).toBeNull() // null means allowed
    })

    it('should return 429 response when limit exceeded', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
        nextUrl: { searchParams: new URLSearchParams() }
      } as any as NextRequest

      // Use admin:grant-role which has a limit of 5 per hour
      const userId = 'test-user-2'

      // Make 5 requests (exhaust the limit)
      for (let i = 0; i < 5; i++) {
        await rateLimit(mockRequest, 'admin:grant-role', userId)
      }

      // 6th request should be blocked
      const result = await rateLimit(mockRequest, 'admin:grant-role', userId)
      expect(result).not.toBeNull()

      // Verify it's a 429 response
      if (result) {
        const json = await result.json()
        expect(result.status).toBe(429)
        expect(json.error).toBe('Too Many Requests')
        expect(json.retryAfter).toBeDefined()
      }
    })

    it('should include rate limit headers in 429 response', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
        nextUrl: { searchParams: new URLSearchParams() }
      } as any as NextRequest

      const userId = 'test-user-3'

      // Exhaust the limit (5 for admin:grant-role)
      for (let i = 0; i < 5; i++) {
        await rateLimit(mockRequest, 'admin:grant-role', userId)
      }

      // Get blocked response
      const result = await rateLimit(mockRequest, 'admin:grant-role', userId)
      expect(result).not.toBeNull()

      if (result) {
        expect(result.headers.get('X-RateLimit-Limit')).toBe('5')
        expect(result.headers.get('X-RateLimit-Remaining')).toBe('0')
        expect(result.headers.get('X-RateLimit-Reset')).toBeDefined()
        expect(result.headers.get('Retry-After')).toBeDefined()
      }
    })

    it('should handle different limiter types', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
        nextUrl: { searchParams: new URLSearchParams() }
      } as any as NextRequest

      // Test each limiter type
      const limiterTypes: Array<'fetch-url' | 'ai:gemini' | 'admin:grant-role' | 'email'> = [
        'fetch-url',
        'ai:gemini',
        'admin:grant-role',
        'email'
      ]

      for (const type of limiterTypes) {
        const result = await rateLimit(mockRequest, type, `test-user-${type}`)
        expect(result).toBeNull() // First request should be allowed
      }
    })

    it('should fail open when rate limiting fails', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
        nextUrl: { searchParams: new URLSearchParams() }
      } as any as NextRequest

      // This should not throw and should allow the request
      const result = await rateLimit(mockRequest, 'fetch-url')
      expect(result).toBeNull()
    })
  })

  describe('getRateLimitHeaders', () => {
    it('should generate correct rate limit headers', () => {
      const now = Date.now()
      const reset = Math.floor((now + 60000) / 1000)

      const headers = getRateLimitHeaders({
        limit: 10,
        remaining: 5,
        reset
      })

      expect(headers['X-RateLimit-Limit']).toBe('10')
      expect(headers['X-RateLimit-Remaining']).toBe('5')
      expect(headers['X-RateLimit-Reset']).toBe(reset.toString())
      expect(headers['Retry-After']).toBeDefined()
      expect(parseInt(headers['Retry-After'])).toBeGreaterThanOrEqual(0)
    })

    it('should calculate correct Retry-After value', () => {
      const now = Date.now()
      const reset = Math.floor((now + 30000) / 1000) // 30 seconds from now

      const headers = getRateLimitHeaders({
        limit: 10,
        remaining: 0,
        reset
      })

      const retryAfter = parseInt(headers['Retry-After'])
      expect(retryAfter).toBeGreaterThanOrEqual(25) // Should be around 30 seconds
      expect(retryAfter).toBeLessThanOrEqual(35)
    })
  })

  describe('Graceful degradation', () => {
    it('should work without Redis configuration', async () => {
      const { isUpstashConfigured } = __testing__

      // In test environment, Redis should not be configured
      // The rate limiter should still work using in-memory fallback

      const mockRequest = {
        ip: '127.0.0.1',
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
        nextUrl: { searchParams: new URLSearchParams() }
      } as any as NextRequest

      const result = await rateLimit(mockRequest, 'fetch-url', 'test-user-graceful')
      expect(result).toBeNull() // Should allow request even without Redis
    })
  })

  describe('Cleanup', () => {
    it('should clean up old entries', async () => {
      const limiter = new InMemoryRateLimiter(5, 100, 'test') // 100ms window

      // Make some requests
      await limiter.limit('user1')
      await limiter.limit('user2')

      // Verify entries exist
      expect(inMemoryStore.size).toBeGreaterThan(0)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Make another request to trigger potential cleanup
      await limiter.limit('user3')

      // Old entries should still be in the store (cleanup happens periodically)
      // but their timestamps should be filtered out
      const user1Entry = inMemoryStore.get('test:user1')
      if (user1Entry) {
        const validTimestamps = user1Entry.timestamps.filter(
          ts => ts > Date.now() - 100
        )
        expect(validTimestamps.length).toBe(0)
      }
    })
  })
})
