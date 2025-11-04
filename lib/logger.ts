/**
 * Production-safe logging utility
 *
 * Provides environment-aware logging that's silent in production
 * (except for errors) and verbose in development.
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger'
 *
 * logger.debug('User data:', userData)
 * logger.info('Feature enabled')
 * logger.warn('Deprecated API call')
 * logger.error('Failed to save', error as Error)
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  /**
   * Debug-level logging for detailed troubleshooting
   * Only logs in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log('debug', message, context)
    }
  }

  /**
   * Info-level logging for important events
   * Only logs in development
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log('info', message, context)
    }
  }

  /**
   * Warning-level logging for potential issues
   * Logs in all environments
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  /**
   * Error-level logging for failures
   * Logs in all environments
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
    }

    // Always add error details if error exists
    if (error) {
      errorContext.errorMessage = error.message || 'No error message'
      errorContext.errorName = error.name || 'Error'

      // Add stack trace in development
      if (this.isDevelopment && error.stack) {
        errorContext.errorStack = error.stack
      }

      // Add cause if present (ES2022 feature)
      if ('cause' in error && error.cause) {
        errorContext.errorCause = String(error.cause)
      }
    }

    this.log('error', message, errorContext)
  }

  /**
   * Internal logging implementation
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString()
    const prefix = this.isDevelopment ? `[${timestamp}] [${level.toUpperCase()}]` : `[${level.toUpperCase()}]`

    const logFn = level === 'error' ? console.error :
                  level === 'warn' ? console.warn :
                  console.log

    // Serialize context by removing undefined/null values and handling Error objects
    const serializedContext = this.serializeContext(context)

    if (serializedContext && Object.keys(serializedContext).length > 0) {
      logFn(prefix, message, serializedContext)
    } else {
      logFn(prefix, message)
    }
  }

  /**
   * Serialize context for logging, removing undefined/null and handling Error objects
   */
  private serializeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined

    const serialized: LogContext = {}

    for (const [key, value] of Object.entries(context)) {
      // Skip undefined and null values
      if (value === undefined || value === null) continue

      // Handle Error objects specially
      if (value instanceof Error) {
        const errorObj: Record<string, any> = {
          message: value.message,
          name: value.name,
        }
        if (this.isDevelopment && value.stack) {
          errorObj.stack = value.stack
        }
        if ('cause' in value && value.cause) {
          errorObj.cause = String(value.cause)
        }
        serialized[key] = errorObj
      } else {
        serialized[key] = value
      }
    }

    return Object.keys(serialized).length > 0 ? serialized : undefined
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for external use
export type { LogLevel, LogContext }
