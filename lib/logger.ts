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
    const errorContext = {
      ...context,
      ...(error && {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
      }),
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

    if (context && Object.keys(context).length > 0) {
      logFn(prefix, message, context)
    } else {
      logFn(prefix, message)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for external use
export type { LogLevel, LogContext }
