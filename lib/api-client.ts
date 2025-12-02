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
import { getCSRFToken } from './csrf'

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
  // Token cache to reduce getIdToken() calls (tokens expire after 1 hour, we cache for 55 min)
  private cachedToken: string | null = null
  private tokenExpiry: number = 0

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
   * Get Firebase ID token for authenticated requests (with caching)
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // Return cached token if still valid
      if (this.cachedToken && Date.now() < this.tokenExpiry) {
        return this.cachedToken
      }

      const auth = getAuth()
      let user = auth.currentUser

      if (!user) {
        // Wait briefly for Firebase Auth to initialize, then retry
        await new Promise(resolve => setTimeout(resolve, 200))
        user = auth.currentUser
        if (!user) return null
      }

      // Force refresh if we're near expiry or have no cached token
      const forceRefresh = !this.cachedToken || this.tokenExpiry <= Date.now()
      const token = await user.getIdToken(forceRefresh)

      // Cache token for 55 minutes (tokens are valid for 60 minutes)
      this.cachedToken = token
      this.tokenExpiry = Date.now() + (55 * 60 * 1000)

      return token
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
   * Clear cached token (useful after logout or token refresh)
   */
  clearTokenCache(): void {
    this.cachedToken = null
    this.tokenExpiry = 0
  }

  /**
   * Build request headers with authentication and CSRF token
   */
  private async buildHeaders(customHeaders?: HeadersInit, method?: string): Promise<Headers> {
    const headers = new Headers(customHeaders)

    // Add auth token if available
    const token = await this.getAuthToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    // Add CSRF token for unsafe methods (POST, PUT, PATCH, DELETE)
    const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
    if (method && unsafeMethods.includes(method.toUpperCase())) {
      const csrfToken = getCSRFToken()
      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken)
      }
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
    const method = options.method || 'GET'
    const headers = await this.buildHeaders(options.headers, method)

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
        const errorInfo = {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          message: data.message,
          details: data.details,
          endpoint
        }
        console.error('[ApiClient] API Error Response:', JSON.stringify(errorInfo, null, 2))
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
      // Log error with more details
      console.error('[ApiClient] Request failed:', {
        endpoint,
        method: options.method || 'GET',
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      })

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
