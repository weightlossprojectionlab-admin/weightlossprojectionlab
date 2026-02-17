/**
 * Standardized API Error Response Handler
 *
 * Used across all API routes to ensure consistent error handling:
 * - Logs full error details server-side
 * - Returns sanitized errors in production
 * - Returns detailed errors in development
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Create a standardized error response
 *
 * @param error - The error object
 * @param context - Additional context for logging (route, IDs, etc.)
 * @returns NextResponse with appropriate error details
 *
 * @example
 * ```typescript
 * try {
 *   // ... API logic
 * } catch (error) {
 *   return errorResponse(error, { route: '/api/patients/[patientId]', patientId })
 * }
 * ```
 */
export function errorResponse(
  error: unknown,
  context?: Record<string, any>
): NextResponse {
  // ALWAYS log full error details server-side
  logger.error('API error', error as Error, context)

  const errorObj = error as any

  // Detect Firebase auth errors → return 401 instead of 500
  // These occur when a token is invalid, expired, or revoked
  const isAuthError = errorObj?.code && (
    String(errorObj.code).startsWith('auth/') ||
    errorObj.code === 'TOKEN_INVALID'
  )

  if (isAuthError) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'TOKEN_INVALID' },
      { status: 401 }
    )
  }

  // Production: Return sanitized generic message
  if (process.env.NODE_ENV === 'production') {
    // Generate error code for debugging without exposing internals
    const errorCode = context?.route
      ? `ERR_${context.route.replace(/\//g, '_').replace(/\[|\]/g, '').toUpperCase()}`
      : 'ERR_UNKNOWN'

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: errorCode,
      },
      { status: 500 }
    )
  }

  // Development: Return full details for debugging
  return NextResponse.json(
    {
      success: false,
      error: errorObj.message || 'Unknown error',
      stack: errorObj.stack,
      context,
    },
    { status: 500 }
  )
}

/**
 * Create a standardized success response
 *
 * @param data - The data to return
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with success data
 *
 * @example
 * ```typescript
 * return successResponse({ patient }, 201)
 * ```
 */
export function successResponse<T = any>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

/**
 * Create a standardized validation error response
 *
 * @param message - Validation error message
 * @param errors - Specific field errors
 * @returns NextResponse with validation errors
 *
 * @example
 * ```typescript
 * return validationError('Invalid input', { email: 'Invalid format' })
 * ```
 */
export function validationError(
  message: string,
  errors?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      validationErrors: errors,
    },
    { status: 400 }
  )
}

/**
 * Create a standardized unauthorized response
 *
 * @param message - Optional custom message
 * @returns NextResponse with 401 status
 */
export function unauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 401 }
  )
}

/**
 * Create a standardized forbidden response
 *
 * @param message - Optional custom message
 * @returns NextResponse with 403 status
 */
export function forbiddenResponse(
  message: string = 'Forbidden'
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 403 }
  )
}

/**
 * Create a standardized not found response
 *
 * @param resource - The resource that wasn't found
 * @returns NextResponse with 404 status
 */
export function notFoundResponse(
  resource: string = 'Resource'
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: `${resource} not found`,
    },
    { status: 404 }
  )
}
