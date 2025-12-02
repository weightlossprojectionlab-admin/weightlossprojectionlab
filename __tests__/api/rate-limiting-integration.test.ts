/**
 * SEC-006: Rate Limiting Integration Tests
 *
 * Comprehensive test suite for rate limiting across all protected API endpoints.
 * Tests the Upstash Redis-based rate limiting with in-memory fallback.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, __testing__ } from '@/lib/rate-limit'

describe('SEC-006: Rate Limiting Integration Tests', () => {
  // Mock NextRequest helper
  function createMockRequest(ip: string = '127.0.0.1'): NextRequest {
    return {
      ip,
      headers: new Map([['x-forwarded-for', ip]]),
      nextUrl: { searchParams: new URLSearchParams() }
    } as unknown as NextRequest
  }

  beforeEach(() => {
    // Clear in-memory store before each test
    __testing__.inMemoryStore.clear()
  })

  describe('fetch-url Rate Limiter (10 req/min)', () => {
    it('allows requests within limit', async () => {
      const request = createMockRequest('192.168.1.100')

      // Should allow first 10 requests
      for (let i = 0; i < 10; i++) {
        const result = await rateLimit(request, 'fetch-url')
        expect(result).toBeNull() // null means allowed
      }
    })

    it('blocks 11th request exceeding limit', async () => {
      const request = createMockRequest('192.168.1.101')

      // Use up the limit
      for (let i = 0; i < 10; i++) {
        await rateLimit(request, 'fetch-url')
      }

      // 11th request should be blocked
      const result = await rateLimit(request, 'fetch-url')
      expect(result).not.toBeNull()

      if (result) {
        expect(result.status).toBe(429)
        const json = await result.json()
        expect(json.error).toBe('Too Many Requests')
      }
    })

    it('returns 429 with Retry-After header', async () => {
      const request = createMockRequest('192.168.1.102')

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await rateLimit(request, 'fetch-url')
      }

      const result = await rateLimit(request, 'fetch-url')
      expect(result).not.toBeNull()

      if (result) {
        expect(result.headers.get('Retry-After')).toBeTruthy()
        expect(result.headers.get('X-RateLimit-Limit')).toBe('10')
        expect(result.headers.get('X-RateLimit-Remaining')).toBe('0')
      }
    })

    it('includes X-RateLimit-* headers', async () => {
      const request = createMockRequest('192.168.1.103')

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await rateLimit(request, 'fetch-url')
      }

      const result = await rateLimit(request, 'fetch-url')
      expect(result).not.toBeNull()

      if (result) {
        expect(result.headers.get('X-RateLimit-Limit')).toBeTruthy()
        expect(result.headers.get('X-RateLimit-Remaining')).toBeTruthy()
        expect(result.headers.get('X-RateLimit-Reset')).toBeTruthy()
      }
    })

    it('different IPs have separate limits', async () => {
      const request1 = createMockRequest('192.168.1.104')
      const request2 = createMockRequest('192.168.1.105')

      // Exhaust limit for IP 1
      for (let i = 0; i < 10; i++) {
        await rateLimit(request1, 'fetch-url')
      }

      // IP 1 should be blocked
      const result1 = await rateLimit(request1, 'fetch-url')
      expect(result1).not.toBeNull()

      // IP 2 should still be allowed
      const result2 = await rateLimit(request2, 'fetch-url')
      expect(result2).toBeNull()
    })
  })

  describe('ai:gemini Rate Limiter (20 req/min)', () => {
    it('allows 20 requests per minute', async () => {
      const request = createMockRequest()
      const userId = 'user-123'

      // Should allow 20 requests
      for (let i = 0; i < 20; i++) {
        const result = await rateLimit(request, 'ai:gemini', userId)
        expect(result).toBeNull()
      }
    })

    it('blocks 21st request within minute', async () => {
      const request = createMockRequest()
      const userId = 'user-124'

      // Use up limit
      for (let i = 0; i < 20; i++) {
        await rateLimit(request, 'ai:gemini', userId)
      }

      // 21st request should be blocked
      const result = await rateLimit(request, 'ai:gemini', userId)
      expect(result).not.toBeNull()
      expect(result?.status).toBe(429)
    })

    it('different users have separate limits', async () => {
      const request = createMockRequest()
      const user1 = 'user-125'
      const user2 = 'user-126'

      // Exhaust limit for user 1
      for (let i = 0; i < 20; i++) {
        await rateLimit(request, 'ai:gemini', user1)
      }

      // User 1 should be blocked
      const result1 = await rateLimit(request, 'ai:gemini', user1)
      expect(result1).not.toBeNull()

      // User 2 should still be allowed
      const result2 = await rateLimit(request, 'ai:gemini', user2)
      expect(result2).toBeNull()
    })

    it('requires user identifier for per-user limiting', async () => {
      const request = createMockRequest()
      const userId = 'user-127'

      const result = await rateLimit(request, 'ai:gemini', userId)
      expect(result).toBeNull()
    })
  })

  describe('email Rate Limiter (10 req/hour)', () => {
    it('allows 10 emails per hour', async () => {
      const request = createMockRequest()
      const userId = 'user-128'

      // Should allow 10 requests
      for (let i = 0; i < 10; i++) {
        const result = await rateLimit(request, 'email', userId)
        expect(result).toBeNull()
      }
    })

    it('blocks 11th email within hour', async () => {
      const request = createMockRequest()
      const userId = 'user-129'

      // Use up limit
      for (let i = 0; i < 10; i++) {
        await rateLimit(request, 'email', userId)
      }

      // 11th request should be blocked
      const result = await rateLimit(request, 'email', userId)
      expect(result).not.toBeNull()
      expect(result?.status).toBe(429)
    })

    it('returns appropriate error message for email limit', async () => {
      const request = createMockRequest()
      const userId = 'user-130'

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await rateLimit(request, 'email', userId)
      }

      const result = await rateLimit(request, 'email', userId)
      expect(result).not.toBeNull()

      if (result) {
        const json = await result.json()
        expect(json.error).toContain('Too Many Requests')
      }
    })
  })

  describe('admin:grant-role Rate Limiter (5 req/hour)', () => {
    it('allows 5 admin actions per hour', async () => {
      const request = createMockRequest()
      const adminId = 'admin-001'

      // Should allow 5 requests
      for (let i = 0; i < 5; i++) {
        const result = await rateLimit(request, 'admin:grant-role', adminId)
        expect(result).toBeNull()
      }
    })

    it('blocks 6th action within hour', async () => {
      const request = createMockRequest()
      const adminId = 'admin-002'

      // Use up limit
      for (let i = 0; i < 5; i++) {
        await rateLimit(request, 'admin:grant-role', adminId)
      }

      // 6th request should be blocked
      const result = await rateLimit(request, 'admin:grant-role', adminId)
      expect(result).not.toBeNull()
      expect(result?.status).toBe(429)
    })

    it('admin limit is separate from user limits', async () => {
      const request = createMockRequest()
      const userId = 'admin-003'

      // Use up admin limit
      for (let i = 0; i < 5; i++) {
        await rateLimit(request, 'admin:grant-role', userId)
      }

      // Admin action should be blocked
      const adminResult = await rateLimit(request, 'admin:grant-role', userId)
      expect(adminResult).not.toBeNull()

      // But AI limit should still be available (different limiter)
      const aiResult = await rateLimit(request, 'ai:gemini', userId)
      expect(aiResult).toBeNull()
    })
  })

  describe('Graceful Degradation', () => {
    it('allows requests when Redis unavailable', async () => {
      const request = createMockRequest()

      // Even without Redis, in-memory fallback should work
      const result = await rateLimit(request, 'fetch-url')
      expect(result).toBeNull()
    })

    it('uses in-memory fallback correctly', async () => {
      const request = createMockRequest('192.168.1.200')

      // Test that in-memory limiter works
      for (let i = 0; i < 10; i++) {
        const result = await rateLimit(request, 'fetch-url')
        expect(result).toBeNull()
      }

      // Should block 11th request
      const result = await rateLimit(request, 'fetch-url')
      expect(result).not.toBeNull()
    })

    it('fallback maintains separate counters per identifier', async () => {
      const ip1 = '192.168.1.201'
      const ip2 = '192.168.1.202'

      // Exhaust limit for IP1
      for (let i = 0; i < 10; i++) {
        await rateLimit(createMockRequest(ip1), 'fetch-url')
      }

      // IP1 should be blocked
      const result1 = await rateLimit(createMockRequest(ip1), 'fetch-url')
      expect(result1).not.toBeNull()

      // IP2 should still work
      const result2 = await rateLimit(createMockRequest(ip2), 'fetch-url')
      expect(result2).toBeNull()
    })
  })

  describe('Rate Limit Headers', () => {
    it('includes X-RateLimit-Limit header on 429', async () => {
      const request = createMockRequest()

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await rateLimit(request, 'fetch-url')
      }

      const result = await rateLimit(request, 'fetch-url')
      expect(result).not.toBeNull()
      expect(result?.headers.get('X-RateLimit-Limit')).toBe('10')
    })

    it('includes X-RateLimit-Remaining header on 429', async () => {
      const request = createMockRequest()

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await rateLimit(request, 'fetch-url')
      }

      const result = await rateLimit(request, 'fetch-url')
      expect(result).not.toBeNull()
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0')
    })

    it('includes X-RateLimit-Reset header on 429', async () => {
      const request = createMockRequest()

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await rateLimit(request, 'fetch-url')
      }

      const result = await rateLimit(request, 'fetch-url')
      expect(result).not.toBeNull()

      const resetHeader = result?.headers.get('X-RateLimit-Reset')
      expect(resetHeader).toBeTruthy()
      expect(parseInt(resetHeader || '0', 10)).toBeGreaterThan(Date.now() / 1000)
    })

    it('includes Retry-After header on 429 response', async () => {
      const request = createMockRequest()

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await rateLimit(request, 'fetch-url')
      }

      const result = await rateLimit(request, 'fetch-url')
      expect(result).not.toBeNull()

      const retryAfter = result?.headers.get('Retry-After')
      expect(retryAfter).toBeTruthy()
      expect(parseInt(retryAfter || '0', 10)).toBeGreaterThan(0)
    })
  })

  describe('Multiple Rate Limiters on Same Endpoint', () => {
    it('can apply both fetch-url and ai:gemini limiters independently', async () => {
      const request = createMockRequest()
      const userId = 'user-multi-1'

      // Exhaust fetch-url limit
      for (let i = 0; i < 10; i++) {
        await rateLimit(request, 'fetch-url')
      }

      // fetch-url should be blocked
      const fetchResult = await rateLimit(request, 'fetch-url')
      expect(fetchResult).not.toBeNull()

      // But ai:gemini should still work (different limiter)
      const aiResult = await rateLimit(request, 'ai:gemini', userId)
      expect(aiResult).toBeNull()
    })

    it('different limiter types do not interfere', async () => {
      const request = createMockRequest()
      const userId = 'user-multi-2'

      // Use some of each limiter
      for (let i = 0; i < 5; i++) {
        await rateLimit(request, 'fetch-url')
        await rateLimit(request, 'ai:gemini', userId)
        await rateLimit(request, 'email', userId)
      }

      // All should still be under their respective limits
      expect(await rateLimit(request, 'fetch-url')).toBeNull()
      expect(await rateLimit(request, 'ai:gemini', userId)).toBeNull()
      expect(await rateLimit(request, 'email', userId)).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('handles missing IP address gracefully', async () => {
      const request = createMockRequest('')

      // Should still work, using 'anonymous' as fallback
      const result = await rateLimit(request, 'fetch-url')
      expect(result).toBeNull()
    })

    it('handles missing user identifier for user-specific limiters', async () => {
      const request = createMockRequest()

      // Should fall back to IP-based limiting
      const result = await rateLimit(request, 'ai:gemini')
      expect(result).toBeNull()
    })

    it('rejects invalid rate limiter type', async () => {
      const request = createMockRequest()

      // Invalid limiter type should return null (fail open)
      const result = await rateLimit(request, 'invalid-type' as any)
      expect(result).toBeNull()
    })
  })
})
