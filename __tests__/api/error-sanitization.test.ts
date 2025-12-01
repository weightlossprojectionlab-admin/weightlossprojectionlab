/**
 * SEC-008: Error Sanitization Tests
 *
 * Tests that verify error responses are properly sanitized in production
 * and include debugging details in development.
 */

import { errorResponse } from '@/lib/api-response'
import { NextResponse } from 'next/server'

describe('SEC-008: Error Sanitization', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('should not expose stack traces', async () => {
      const error = new Error('Database connection failed')
      const response = errorResponse(error, {
        route: '/api/test',
        operation: 'fetch'
      })

      const json = await response.json()

      expect(json).toHaveProperty('success', false)
      expect(json).toHaveProperty('error', 'Internal server error')
      expect(json).toHaveProperty('code', 'ERR__API_TEST')
      expect(json).not.toHaveProperty('stack')
      expect(response.status).toBe(500)
    })

    it('should not expose detailed error messages', async () => {
      const error = new Error('SELECT * FROM users WHERE password = "secret123"')
      const response = errorResponse(error, {
        route: '/api/users',
        operation: 'query'
      })

      const json = await response.json()

      expect(json.error).toBe('Internal server error')
      expect(json.error).not.toContain('SELECT')
      expect(json.error).not.toContain('password')
      expect(json.error).not.toContain('secret123')
    })

    it('should generate error codes from route names', async () => {
      const testCases = [
        { route: '/api/patients', expectedCode: 'ERR__API_PATIENTS' },
        { route: '/api/patients/[patientId]', expectedCode: 'ERR__API_PATIENTS_PATIENTID' },
        { route: '/api/admin/users/export', expectedCode: 'ERR__API_ADMIN_USERS_EXPORT' }
      ]

      for (const { route, expectedCode } of testCases) {
        const error = new Error('Test error')
        const response = errorResponse(error, { route, operation: 'test' })
        const json = await response.json()

        expect(json.code).toBe(expectedCode)
      }
    })

    it('should handle non-Error objects', async () => {
      const stringError = 'Something went wrong'
      const response = errorResponse(stringError, {
        route: '/api/test',
        operation: 'fetch'
      })

      const json = await response.json()

      expect(json.success).toBe(false)
      expect(json.error).toBe('Internal server error')
      expect(json).not.toHaveProperty('stack')
    })

    it('should handle errors without context', async () => {
      const error = new Error('Generic error')
      const response = errorResponse(error, {})

      const json = await response.json()

      expect(json.success).toBe(false)
      expect(json.error).toBe('Internal server error')
      expect(json.code).toBe('ERR_UNKNOWN')
    })
  })

  describe('Development Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should include stack traces for debugging', async () => {
      const error = new Error('Database connection failed')
      const response = errorResponse(error, {
        route: '/api/test',
        operation: 'fetch'
      })

      const json = await response.json()

      expect(json).toHaveProperty('success', false)
      expect(json).toHaveProperty('error', 'Database connection failed')
      expect(json).toHaveProperty('stack')
      expect(json.stack).toContain('Error: Database connection failed')
      expect(response.status).toBe(500)
    })

    it('should include detailed error messages', async () => {
      const error = new Error('Failed to query database: connection timeout')
      const response = errorResponse(error, {
        route: '/api/users',
        operation: 'query'
      })

      const json = await response.json()

      expect(json.error).toBe('Failed to query database: connection timeout')
      expect(json.error).toContain('connection timeout')
    })

    it('should include context in response', async () => {
      const error = new Error('Test error')
      const context = {
        route: '/api/patients',
        operation: 'create',
        userId: 'user123',
        patientId: 'patient456'
      }

      const response = errorResponse(error, context)
      const json = await response.json()

      expect(json).toHaveProperty('context')
      expect(json.context).toEqual(context)
    })

    it('should preserve error stack trace structure', async () => {
      const error = new Error('Test error')
      Error.captureStackTrace(error)

      const response = errorResponse(error, {
        route: '/api/test',
        operation: 'test'
      })
      const json = await response.json()

      expect(json.stack).toBeDefined()
      expect(json.stack).toContain('at ')
      expect(typeof json.stack).toBe('string')
    })
  })

  describe('Test Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test'
    })

    it('should behave like development mode', async () => {
      const error = new Error('Test error')
      const response = errorResponse(error, {
        route: '/api/test',
        operation: 'test'
      })

      const json = await response.json()

      // Should include stack trace in test mode
      expect(json).toHaveProperty('stack')
      expect(json.error).toBe('Test error')
    })
  })

  describe('Response Format Consistency', () => {
    it('should always return success: false', async () => {
      process.env.NODE_ENV = 'production'
      const response1 = errorResponse(new Error('Error 1'), { route: '/api/test' })
      const json1 = await response1.json()

      process.env.NODE_ENV = 'development'
      const response2 = errorResponse(new Error('Error 2'), { route: '/api/test' })
      const json2 = await response2.json()

      expect(json1.success).toBe(false)
      expect(json2.success).toBe(false)
    })

    it('should always return status 500', async () => {
      process.env.NODE_ENV = 'production'
      const response1 = errorResponse(new Error('Error 1'), { route: '/api/test' })

      process.env.NODE_ENV = 'development'
      const response2 = errorResponse(new Error('Error 2'), { route: '/api/test' })

      expect(response1.status).toBe(500)
      expect(response2.status).toBe(500)
    })

    it('should always be a NextResponse', () => {
      const response = errorResponse(new Error('Test'), { route: '/api/test' })
      expect(response).toBeInstanceOf(NextResponse)
    })
  })

  describe('Security: Information Leakage Prevention', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('should not leak file paths', async () => {
      const error = new Error('ENOENT: no such file or directory, open \'/etc/secrets/api-keys.txt\'')
      const response = errorResponse(error, {
        route: '/api/test',
        operation: 'read'
      })

      const json = await response.json()

      expect(json.error).toBe('Internal server error')
      expect(json.error).not.toContain('/etc/')
      expect(json.error).not.toContain('api-keys')
    })

    it('should not leak database connection strings', async () => {
      const error = new Error('Connection failed: postgres://admin:password@localhost:5432/db')
      const response = errorResponse(error, {
        route: '/api/test',
        operation: 'connect'
      })

      const json = await response.json()

      expect(json.error).toBe('Internal server error')
      expect(json.error).not.toContain('postgres://')
      expect(json.error).not.toContain('password')
      expect(json.error).not.toContain('localhost')
    })

    it('should not leak API keys or tokens', async () => {
      const error = new Error('API key sk_live_abc123xyz789 is invalid')
      const response = errorResponse(error, {
        route: '/api/test',
        operation: 'auth'
      })

      const json = await response.json()

      expect(json.error).toBe('Internal server error')
      expect(json.error).not.toContain('sk_live_')
      expect(json.error).not.toContain('abc123xyz789')
    })

    it('should not leak internal code structure via stack traces', async () => {
      const error = new Error('Test error')
      Error.captureStackTrace(error)

      const response = errorResponse(error, {
        route: '/api/test',
        operation: 'test'
      })

      const json = await response.json()

      expect(json).not.toHaveProperty('stack')
    })
  })

  describe('Error Code Generation', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('should generate consistent error codes', async () => {
      const error1 = new Error('Error 1')
      const error2 = new Error('Error 2')

      const response1 = errorResponse(error1, { route: '/api/patients', operation: 'fetch' })
      const response2 = errorResponse(error2, { route: '/api/patients', operation: 'create' })

      const json1 = await response1.json()
      const json2 = await response2.json()

      // Same route should generate same error code
      expect(json1.code).toBe(json2.code)
      expect(json1.code).toBe('ERR__API_PATIENTS')
    })

    it('should sanitize route parameters in error codes', async () => {
      const error = new Error('Test')
      const response = errorResponse(error, {
        route: '/api/patients/[patientId]/vitals/[vitalId]',
        operation: 'fetch'
      })

      const json = await response.json()

      expect(json.code).toBe('ERR__API_PATIENTS_PATIENTID_VITALS_VITALID')
      expect(json.code).not.toContain('[')
      expect(json.code).not.toContain(']')
    })
  })
})
