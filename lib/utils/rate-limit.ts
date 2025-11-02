/**
 * Rate Limiting Utilities
 *
 * Provides Redis-based rate limiting for API endpoints using Upstash.
 * Supports per-user and global rate limits.
 *
 * NOTE: Upstash packages are optional. If not installed, all rate limits
 * will be disabled and all requests will be allowed (development mode).
 */

// Type-only imports (won't trigger build errors)
type Ratelimit = any
type Redis = any

/**
 * Stub rate limiters (all null since Upstash is not installed)
 * These will allow all requests to pass through.
 */
export const aiRateLimit: Ratelimit | null = null
export const apiRateLimit: Ratelimit | null = null
export const strictRateLimit: Ratelimit | null = null
export const dailyRateLimit: Ratelimit | null = null

/**
 * Check rate limit for a user
 *
 * @param limiter - The rate limiter to use
 * @param identifier - User ID or other identifier
 * @returns { success: boolean, limit: number, remaining: number, reset: number }
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
  reason?: string
}> {
  // If Redis is not configured, allow all requests (development mode)
  if (!limiter) {
    console.warn('[RateLimit] Redis not configured, allowing request')
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      reason: 'Redis not configured'
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
    console.error('[RateLimit] Error checking rate limit:', error)
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
 * const rateLimitResult = await withRateLimit(aiRateLimit, userId)
 * if (!rateLimitResult.success) {
 *   return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
 * }
 * ```
 */
export async function withRateLimit(
  limiter: Ratelimit | null,
  identifier: string
) {
  return checkRateLimit(limiter, identifier)
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: {
  limit: number
  remaining: number
  reset: number
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
  }
}

/**
 * Create a custom rate limiter with specific limits
 *
 * NOTE: Returns null since Upstash is not installed
 */
export function createCustomRateLimit(
  requests: number,
  window: string,
  prefix: string
): Ratelimit | null {
  console.warn('[RateLimit] Upstash not installed, custom rate limit disabled')
  return null
}
