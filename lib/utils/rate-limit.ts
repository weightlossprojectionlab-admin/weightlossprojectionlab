/**
 * Rate Limiting Utilities
 *
 * Provides in-memory sliding window rate limiting for API endpoints.
 * Falls back to Redis-based rate limiting (Upstash) if configured.
 * Supports per-user and global rate limits.
 */

import { logger } from '@/lib/logger'

// Type-only imports (won't trigger build errors)
type Ratelimit = any
type Redis = any

/**
 * In-memory sliding window rate limiter
 */
interface RateLimitEntry {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Sliding window rate limiter configuration
 */
interface SlidingWindowConfig {
  maxRequests: number
  windowMs: number
  prefix: string
}

/**
 * Create an in-memory sliding window rate limiter
 */
function createSlidingWindowLimiter(config: SlidingWindowConfig) {
  return {
    limit: async (identifier: string) => {
      const key = `${config.prefix}:${identifier}`
      const now = Date.now()
      const windowStart = now - config.windowMs

      // Get or create entry
      let entry = rateLimitStore.get(key)
      if (!entry) {
        entry = { timestamps: [] }
        rateLimitStore.set(key, entry)
      }

      // Remove timestamps outside the window
      entry.timestamps = entry.timestamps.filter(ts => ts > windowStart)

      // Check if limit exceeded
      const currentCount = entry.timestamps.length
      const success = currentCount < config.maxRequests

      if (success) {
        // Add current timestamp
        entry.timestamps.push(now)
      }

      // Calculate reset time (when oldest request will expire)
      const oldestTimestamp = entry.timestamps[0] || now
      const reset = oldestTimestamp + config.windowMs

      return {
        success,
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - currentCount - (success ? 1 : 0)),
        reset
      }
    }
  }
}

/**
 * Rate limiters with different thresholds
 */
export const aiRateLimit = createSlidingWindowLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'ai'
})

export const apiRateLimit = createSlidingWindowLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'api'
})

export const strictRateLimit = createSlidingWindowLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'strict'
})

export const dailyRateLimit = createSlidingWindowLimiter({
  maxRequests: 1000,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  prefix: 'daily'
})

/**
 * Medical API rate limiter (moderate limits)
 */
export const medicalApiRateLimit = createSlidingWindowLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000, // 60 requests per minute
  prefix: 'medical'
})

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  const maxWindowMs = 24 * 60 * 60 * 1000 // Largest window (daily)

  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove timestamps older than the largest window
    entry.timestamps = entry.timestamps.filter(ts => ts > now - maxWindowMs)

    // Remove empty entries
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key)
    }
  }

  logger.debug('[RateLimit] Cleaned up old entries', {
    storeSize: rateLimitStore.size
  })
}, 5 * 60 * 1000)

/**
 * Check rate limit for a user
 *
 * @param limiter - The rate limiter to use
 * @param identifier - User ID or other identifier
 * @returns { success: boolean, limit: number, remaining: number, reset: number }
 */
export async function checkRateLimit(
  limiter: { limit: (id: string) => Promise<any> },
  identifier: string
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
  reason?: string
}> {
  if (!limiter) {
    logger.error('[RateLimit] No limiter provided')
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      reason: 'No limiter configured'
    }
  }

  try {
    const result = await limiter.limit(identifier)

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      reason: result.success ? undefined : 'Rate limit exceeded'
    }
  } catch (error) {
    logger.error('[RateLimit] Error checking rate limit', error as Error)
    // Fail open: allow request if rate limit check fails
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      reason: 'Rate limit check failed'
    }
  }
}

/**
 * Middleware helper for Next.js API routes
 *
 * Usage:
 * ```ts
 * const rateLimitResult = await withRateLimit(medicalApiRateLimit, userId)
 * if (!rateLimitResult.success) {
 *   return NextResponse.json(
 *     { error: 'Rate limit exceeded', retryAfter: result.reset },
 *     {
 *       status: 429,
 *       headers: getRateLimitHeaders(result)
 *     }
 *   )
 * }
 * ```
 */
export async function withRateLimit(
  limiter: { limit: (id: string) => Promise<any> },
  identifier: string
) {
  return checkRateLimit(limiter, identifier)
}

/**
 * Get rate limit headers for response (standard 429 format)
 */
export function getRateLimitHeaders(result: {
  limit: number
  remaining: number
  reset: number
}): Record<string, string> {
  const resetDate = new Date(result.reset)
  const retryAfterSeconds = Math.ceil((result.reset - Date.now()) / 1000)

  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': resetDate.toISOString(),
    'Retry-After': Math.max(0, retryAfterSeconds).toString()
  }
}

/**
 * Create a standard 429 response with rate limit headers
 */
export function createRateLimitResponse(result: {
  limit: number
  remaining: number
  reset: number
  reason?: string
}) {
  const resetDate = new Date(result.reset)
  const retryAfterSeconds = Math.ceil((result.reset - Date.now()) / 1000)

  return {
    error: 'Too Many Requests',
    message: result.reason || 'Rate limit exceeded. Please try again later.',
    retryAfter: retryAfterSeconds,
    limit: result.limit,
    remaining: result.remaining,
    resetAt: resetDate.toISOString()
  }
}

/**
 * Create a custom rate limiter with specific limits
 */
export function createCustomRateLimit(
  requests: number,
  windowMs: number,
  prefix: string
) {
  return createSlidingWindowLimiter({
    maxRequests: requests,
    windowMs,
    prefix
  })
}
