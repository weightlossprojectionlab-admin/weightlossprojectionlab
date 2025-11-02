/**
 * Next.js Instrumentation Hook
 *
 * This file runs once when the server starts (both dev and production).
 * Perfect for environment validation and initialization tasks.
 *
 * Documentation: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env-validator')

    // Validate environment variables at startup
    // Will throw error in development, log warning in production
    try {
      validateEnv()
    } catch (error) {
      // In development, this will stop the server
      // In production, it will log the error but continue
      if (process.env.NODE_ENV === 'development') {
        throw error
      } else {
        console.error('Environment validation failed in production:', error)
      }
    }
  }
}
