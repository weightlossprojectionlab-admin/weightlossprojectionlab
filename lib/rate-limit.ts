/**
 * Distributed Rate Limiting with Upstash Redis
 *
 * Provides distributed rate limiting for sensitive endpoints using Upstash Redis.
 * Gracefully degrades to in-memory rate limiting when Redis is not configured.
 *
 * Security Requirements:
 * - SEC-006: Distributed rate limiting with Upstash Redis
 * - Different limits for different endpoint types
 * - 429 responses with Retry-After headers
 * - Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Type-safe imports for Upstash
type RatelimitInstance = any
type RedisInstance = any

let Ratelimit: any = null
let Redis: any = null
let upstashConfigured = false

// Try to import Upstash dependencies
try {
  const upstashRatelimit = require('@upstash/ratelimit')
  const upstashRedis = require('@upstash/redis')
  Ratelimit = upstashRatelimit.Ratelimit
  Redis = upstashRedis.Redis
  upstashConfigured = true
} catch (error) {
  logger.warn('Upstash Redis not available, using in-memory fallback')
}

// In-memory fallback for development/testing
interface InMemoryRateLimitEntry {
  timestamps: number[]
}

const inMemoryStore = new Map<string, InMemoryRateLimitEntry>()

/**
 * In-memory rate limiter (fallback)
 */
class InMemoryRateLimiter {
  constructor(
    private maxRequests: number,
    private windowMs: number,
    private prefix: string
  ) {}

  async limit(identifier: string) {
    const key = `${this.prefix}:${identifier}`
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Get or create entry
    let entry = inMemoryStore.get(key)
    if (!entry) {
      entry = { timestamps: [] }
      inMemoryStore.set(key, entry)
    }

    // Remove old timestamps
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart)

    // Check limit
    const success = entry.timestamps.length < this.maxRequests
    const remaining = Math.max(0, this.maxRequests - entry.timestamps.length - (success ? 1 : 0))

    if (success) {
      entry.timestamps.push(now)
    }

    // Calculate reset time
    const oldestTimestamp = entry.timestamps[0] || now
    const reset = Math.ceil((oldestTimestamp + this.windowMs) / 1000) // Unix timestamp

    return {
      success,
      limit: this.maxRequests,
      remaining,
      reset,
      pending: Promise.resolve()
    }
  }
}

// Initialize Redis client if configured
let redis: RedisInstance | null = null

if (upstashConfigured && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    logger.info('Upstash Redis configured for distributed rate limiting')
  } catch (error) {
    logger.error('Failed to initialize Upstash Redis', error as Error)
  }
} else {
  logger.warn('Upstash Redis not configured - using in-memory rate limiting (dev/test mode)')
}

/**
 * Create a rate limiter with graceful degradation
 */
function createRateLimiter(
  maxRequests: number,
  window: number,
  unit: 's' | 'm' | 'h' | 'd',
  prefix: string
): RatelimitInstance | InMemoryRateLimiter {
  if (redis && Ratelimit) {
    try {
      return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxRequests, `${window} ${unit}`),
        prefix,
        analytics: true,
      })
    } catch (error) {
      logger.error(`Failed to create Upstash rate limiter for ${prefix}`, error as Error)
    }
  }

  // Fallback to in-memory
  const windowMs = unit === 's' ? window * 1000
    : unit === 'm' ? window * 60 * 1000
    : unit === 'h' ? window * 60 * 60 * 1000
    : window * 24 * 60 * 60 * 1000

  return new InMemoryRateLimiter(maxRequests, windowMs, prefix)
}

/**
 * Rate limiters for different endpoint types
 */

// fetch-url endpoint: 10 requests per minute
export const fetchUrlLimiter = createRateLimiter(10, 1, 'm', 'fetch-url')

// Gemini AI endpoints: 20 requests per minute (Gemini free tier)
export const geminiLimiter = createRateLimiter(20, 1, 'm', 'ai:gemini')

// Admin grant-role: 5 requests per hour
export const adminGrantRoleLimiter = createRateLimiter(5, 1, 'h', 'admin:grant-role')

// Email endpoints: 10 requests per hour per user
export const emailLimiter = createRateLimiter(10, 1, 'h', 'email')

/**
 * Rate limit response headers
 */
export function getRateLimitHeaders(result: {
  limit: number
  remaining: number
  reset: number
}): Record<string, string> {
  const retryAfter = Math.max(0, result.reset - Math.floor(Date.now() / 1000))

  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
    'Retry-After': retryAfter.toString()
  }
}

/**
 * Apply rate limiting to a request
 * Returns a 429 Response if rate limit exceeded, or null if allowed
 *
 * @param request - Next.js request object
 * @param limiterType - Type of rate limiter to use
 * @param identifier - Optional custom identifier (defaults to IP address)
 */
export async function rateLimit(
  request: NextRequest,
  limiterType: 'fetch-url' | 'ai:gemini' | 'admin:grant-role' | 'email',
  identifier?: string
): Promise<NextResponse | null> {
  // Select the appropriate limiter
  let limiter: RatelimitInstance | InMemoryRateLimiter
  switch (limiterType) {
    case 'fetch-url':
      limiter = fetchUrlLimiter
      break
    case 'ai:gemini':
      limiter = geminiLimiter
      break
    case 'admin:grant-role':
      limiter = adminGrantRoleLimiter
      break
    case 'email':
      limiter = emailLimiter
      break
    default:
      logger.error('Invalid rate limiter type', new Error(`Invalid limiter type: ${limiterType}`))
      return null
  }

  // Get identifier (user ID, IP, etc.)
  const id = identifier || request.headers.get('x-forwarded-for') || 'anonymous'

  try {
    const result = await limiter.limit(id)

    // Log rate limit check
    logger.debug('Rate limit check', {
      limiterType,
      identifier: id,
      success: result.success,
      remaining: result.remaining,
      limit: result.limit
    })

    if (!result.success) {
      // Rate limit exceeded
      const headers = getRateLimitHeaders(result)

      logger.warn('Rate limit exceeded', {
        limiterType,
        identifier: id,
        limit: result.limit,
        retryAfter: headers['Retry-After']
      })

      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: parseInt(headers['Retry-After'], 10)
        },
        {
          status: 429,
          headers
        }
      )
    }

    return null // Request allowed
  } catch (error) {
    logger.error('Rate limit check failed', error as Error)
    // Fail open - allow request if rate limiting fails
    return null
  }
}

/**
 * Cleanup old in-memory entries periodically
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    for (const [key, entry] of inMemoryStore.entries()) {
      entry.timestamps = entry.timestamps.filter(ts => ts > now - maxAge)
      if (entry.timestamps.length === 0) {
        inMemoryStore.delete(key)
      }
    }

    logger.debug('Rate limit cleanup', { storeSize: inMemoryStore.size })
  }, 5 * 60 * 1000) // Every 5 minutes
}

/**
 * Export for testing
 */
export const __testing__ = {
  inMemoryStore,
  InMemoryRateLimiter,
  isUpstashConfigured: !!redis
}
