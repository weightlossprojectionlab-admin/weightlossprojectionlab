/**
 * Shared API Client with standardized error handling
 *
 * Provides type-safe API requests with:
 * - Automatic authentication token injection
 * - Zod validation of responses
 * - Centralized error handling
 * - Request/response interceptors
 */

import { z } from 'zod'
import { getAuth } from 'firebase/auth'
import { ErrorHandler } from './utils/error-handler'

// ============================================
// TYPES
// ============================================

export interface ApiClientOptions {
  validateResponse?: boolean
  retryOnFailure?: boolean
  maxRetries?: number
}

export interface ApiError extends Error {
  status?: number
  code?: string
  details?: unknown
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: unknown
}

// ============================================
// API CLIENT CLASS
// ============================================

class ApiClient {
  private baseUrl: string
  private defaultOptions: ApiClientOptions

  constructor(baseUrl: string = '/api', options: ApiClientOptions = {}) {
    this.baseUrl = baseUrl
    this.defaultOptions = {
      validateResponse: true,
      retryOnFailure: false,
      maxRetries: 3,
      ...options,
    }
  }

  /**
   * Get Firebase ID token for authenticated requests
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const auth = getAuth()
      const user = auth.currentUser
      if (!user) return null
      return await user.getIdToken()
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'get_auth_token',
        component: 'api-client',
        severity: 'warning',
      })
      return null
    }
  }

  /**
   * Build request headers with authentication
   */
  private async buildHeaders(customHeaders?: HeadersInit): Promise<Headers> {
    const headers = new Headers(customHeaders)

    // Add auth token if available
    const token = await this.getAuthToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    // Add content type if not set
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    return headers
  }

  /**
   * Make HTTP request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    schema?: z.ZodSchema<T>,
    clientOptions: ApiClientOptions = {}
  ): Promise<T> {
    const mergedOptions = { ...this.defaultOptions, ...clientOptions }
    const url = `${this.baseUrl}${endpoint}`
    const headers = await this.buildHeaders(options.headers)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        if (!response.ok) {
          throw this.createApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status
          )
        }
        // Return raw response for non-JSON
        return response as unknown as T
      }

      // Parse JSON response
      const data: ApiResponse<T> = await response.json()

      // Handle error responses
      if (!response.ok || !data.success) {
        throw this.createApiError(
          data.error || data.message || 'Request failed',
          response.status,
          data.details
        )
      }

      // Validate response with Zod schema if provided
      if (schema && mergedOptions.validateResponse) {
        try {
          return schema.parse(data.data)
        } catch (validationError) {
          ErrorHandler.handle(validationError, {
            operation: 'validate_api_response',
            component: 'api-client',
            severity: 'warning',
            metadata: { endpoint, data: data.data },
          })
          // Return unvalidated data if validation fails (for backwards compatibility)
          return data.data as T
        }
      }

      return data.data as T
    } catch (error) {
      // Log error
      ErrorHandler.handle(error, {
        operation: 'api_request',
        component: 'api-client',
        metadata: { endpoint, method: options.method || 'GET' },
      })

      // Rethrow for caller to handle
      throw error
    }
  }

  /**
   * Create standardized API error
   */
  private createApiError(message: string, status?: number, details?: unknown): ApiError {
    const error = new Error(message) as ApiError
    error.name = 'ApiError'
    error.status = status
    error.details = details
    return error
  }

  // ============================================
  // HTTP METHODS
  // ============================================

  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    schema?: z.ZodSchema<T>,
    options: ApiClientOptions = {}
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      { method: 'GET' },
      schema,
      options
    )
  }

  /**
   * POST request
   */
  async post<T, D = unknown>(
    endpoint: string,
    data: D,
    schema?: z.ZodSchema<T>,
    options: ApiClientOptions = {}
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      schema,
      options
    )
  }

  /**
   * PUT request
   */
  async put<T, D = unknown>(
    endpoint: string,
    data: D,
    schema?: z.ZodSchema<T>,
    options: ApiClientOptions = {}
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      schema,
      options
    )
  }

  /**
   * PATCH request
   */
  async patch<T, D = unknown>(
    endpoint: string,
    data: D,
    schema?: z.ZodSchema<T>,
    options: ApiClientOptions = {}
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      schema,
      options
    )
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    schema?: z.ZodSchema<T>,
    options: ApiClientOptions = {}
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      { method: 'DELETE' },
      schema,
      options
    )
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const apiClient = new ApiClient()

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

/**
 * Type guard to check if error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'status' in error
}
