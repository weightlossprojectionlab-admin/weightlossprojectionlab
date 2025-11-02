/**
 * Centralized Error Handler
 *
 * Provides consistent error handling across the application with:
 * - Structured logging
 * - User-friendly error messages
 * - Error serialization for logging
 */

import { logger } from '@/lib/logger'
import { FirebaseError } from 'firebase/app'

export interface ErrorContext {
  operation: string
  userId?: string
  component?: string
  metadata?: Record<string, any>
  showToast?: boolean
  severity?: 'error' | 'warning' | 'info'
}

export interface SerializedError {
  name: string
  message: string
  code?: string
  stack?: string
  [key: string]: any
}

/**
 * Centralized error handler
 */
export class ErrorHandler {
  /**
   * Handle an error with logging and optional user notification
   */
  static handle(error: unknown, context: ErrorContext): void {
    const serialized = this.serialize(error, context)

    // 1. Console log (always, for debugging)
    console.error(`[ErrorHandler] ${context.operation}`, {
      error: serialized,
      context
    })

    // 2. Structured logger
    logger.error(context.operation, undefined, {
      ...serialized,
      ...context.metadata,
      userId: context.userId,
      component: context.component
    })
  }

  /**
   * Serialize error object for logging
   */
  static serialize(error: unknown, context?: ErrorContext): SerializedError {
    // Handle Error instances
    if (error instanceof Error) {
      const serialized: SerializedError = {
        name: error.name,
        message: error.message,
        stack: error.stack
      }

      // Add Firebase-specific error details
      if (error instanceof FirebaseError) {
        serialized.code = error.code
        serialized.customData = (error as any).customData
      }

      // Add any custom properties
      Object.keys(error).forEach(key => {
        if (!['name', 'message', 'stack'].includes(key)) {
          serialized[key] = (error as any)[key]
        }
      })

      return serialized
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        name: 'Error',
        message: error
      }
    }

    // Handle objects with message property
    if (error && typeof error === 'object' && 'message' in error) {
      return {
        name: (error as any).name || 'Error',
        message: String((error as any).message),
        ...(error as any)
      }
    }

    // Fallback for unknown error types
    return {
      name: 'UnknownError',
      message: String(error)
    }
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: unknown): string {
    const serialized = this.serialize(error)

    // Firebase errors
    if (serialized.code) {
      const firebaseMessages: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'An account with this email already exists',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/invalid-email': 'Invalid email address',
        'auth/network-request-failed': 'Network error. Please check your connection',
        'permission-denied': 'You do not have permission to perform this action',
        'not-found': 'The requested resource was not found',
        'already-exists': 'This resource already exists',
        'resource-exhausted': 'Quota exceeded. Please try again later',
        'unauthenticated': 'Please sign in to continue'
      }

      if (firebaseMessages[serialized.code]) {
        return firebaseMessages[serialized.code]
      }
    }

    // API errors
    if (serialized.message.includes('404')) {
      return 'Resource not found'
    }
    if (serialized.message.includes('429')) {
      return 'Too many requests. Please try again later'
    }
    if (serialized.message.includes('500') || serialized.message.includes('503')) {
      return 'Server error. Please try again later'
    }

    // Network errors
    if (serialized.message.includes('network') || serialized.message.includes('fetch')) {
      return 'Network error. Please check your connection and try again'
    }

    // Generic fallback
    return serialized.message || 'An unexpected error occurred'
  }

  /**
   * Check if error is a specific type
   */
  static isFirebaseError(error: unknown): error is FirebaseError {
    return error instanceof FirebaseError
  }

  /**
   * Check if error is a network error
   */
  static isNetworkError(error: unknown): boolean {
    const serialized = this.serialize(error)
    return serialized.message.toLowerCase().includes('network') ||
           serialized.message.toLowerCase().includes('fetch') ||
           serialized.code === 'auth/network-request-failed'
  }

  /**
   * Check if error is a permission error
   */
  static isPermissionError(error: unknown): boolean {
    const serialized = this.serialize(error)
    return serialized.code === 'permission-denied' ||
           serialized.code === 'auth/unauthorized' ||
           serialized.message.toLowerCase().includes('unauthorized')
  }
}

/**
 * Convenience function for common error handling pattern
 */
export async function withErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Omit<ErrorContext, 'operation'>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    ErrorHandler.handle(error, {
      operation,
      ...context
    })
    throw error
  }
}
