'use client'

import { Component, ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: any
}

/**
 * Error boundary for the Dashboard page
 * Prevents the entire dashboard from crashing when a component fails
 */
export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error to console in development
    logger.error('Dashboard error:', error, errorInfo)

    // In production, you would send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo })

    this.setState({
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We're having trouble loading your dashboard. This has been logged and we'll look into it.
              </p>
            </div>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 text-left">
                <details className="bg-error-light border border-error rounded-lg p-4">
                  <summary className="cursor-pointer font-medium text-error-dark text-sm mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="text-xs font-mono text-error-dark space-y-2">
                    <p className="font-bold">{this.state.error.name}</p>
                    <p>{this.state.error.message}</p>
                    {this.state.error.stack && (
                      <pre className="overflow-x-auto whitespace-pre-wrap mt-2 p-2 bg-white dark:bg-gray-800 rounded">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
              >
                Reload Dashboard
              </button>

              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined })
                }}
                className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Try Again
              </button>

              <a
                href="/"
                className="block w-full px-6 py-3 text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Go to Home
              </a>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                If this problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
