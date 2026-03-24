/** @jest-environment node */
/**
 * Admin Recipes API Tests
 *
 * Assertion tests for:
 * - GET    /api/admin/recipes          (list all recipes)
 * - POST   /api/admin/recipes          (create recipe)
 * - GET    /api/admin/recipes/[id]     (get single recipe)
 * - PUT    /api/admin/recipes/[id]     (update recipe)
 * - DELETE /api/admin/recipes/[id]     (delete recipe)
 */

import { NextRequest } from 'next/server'

// ==================== MOCKS ====================

const mockVerifyIdToken = jest.fn()
const mockGetDoc = jest.fn()
const mockSetDoc = jest.fn()
const mockUpdateDoc = jest.fn()
const mockDeleteDoc = jest.fn()
const mockCollectionGet = jest.fn()

jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args)
  },
  adminDb: {
    collection: jest.fn((name: string) => ({
      doc: jest.fn((id: string) => ({
        get: mockGetDoc,
        set: mockSetDoc,
        update: mockUpdateDoc,
        delete: mockDeleteDoc,
      })),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: mockCollectionGet,
    }))
  }
}))

jest.mock('@/lib/admin/permissions', () => ({
  isSuperAdmin: jest.fn((email: string) => email === 'admin@test.com'),
  getPermissions: jest.fn(() => ({ canModerateRecipes: true }))
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}))

jest.mock('@/lib/api-response', () => ({
  errorResponse: jest.fn((error: any, context: any) => {
    const { NextResponse } = require('next/server')
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  })
}))

jest.mock('@/lib/firestore-helpers', () => ({
  removeUndefinedValues: jest.fn((obj: any) => {
    const result: any = {}
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) result[key] = obj[key]
    })
    return result
  })
}))

// ==================== IMPORTS ====================

import { GET, POST } from '@/app/api/admin/recipes/route'
import { GET as getRecipe, PUT as updateRecipe, DELETE as deleteRecipe } from '@/app/api/admin/recipes/[id]/route'

// ==================== HELPERS ====================

const ADMIN_UID = 'admin-uid-123'
const ADMIN_EMAIL = 'admin@test.com'
const RECIPE_ID = 'recipe-test-123'

function makeRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3003'), {
    ...options,
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

function makeRecipeData(overrides: Record<string, any> = {}) {
  return {
    name: 'Test Recipe',
    description: 'A test recipe',
    mealType: 'lunch',
    prepTime: 30,
    servingSize: 4,
    dietaryTags: ['high-protein'],
    calories: 500,
    macros: { protein: 30, carbs: 40, fat: 15, fiber: 5 },
    ingredientsV2: [{ ingredientText: '2 cups rice', quantity: 2, unit: 'cups' }],
    ingredients: ['2 cups rice'],
    recipeSteps: ['Cook rice', 'Serve'],
    cookingTips: ['Use jasmine rice'],
    status: 'published',
    allergens: [],
    ...overrides,
  }
}

function setupAdminAuth() {
  mockVerifyIdToken.mockResolvedValue({ uid: ADMIN_UID, email: ADMIN_EMAIL })
  mockGetDoc.mockResolvedValue({
    exists: true,
    data: () => ({ role: 'admin', email: ADMIN_EMAIL })
  })
}

function setupNonAdminAuth() {
  mockVerifyIdToken.mockResolvedValue({ uid: 'user-123', email: 'user@test.com' })
  mockGetDoc.mockResolvedValue({
    exists: true,
    data: () => ({ role: 'user', email: 'user@test.com' })
  })
}

// ==================== TESTS ====================

describe('Admin Recipes API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==================== AUTH ====================

  describe('Authentication & Authorization', () => {
    it('returns 401 when no auth token provided', async () => {
      const req = new NextRequest(new URL('http://localhost:3003/api/admin/recipes'), {
        headers: { 'Content-Type': 'application/json' },
      })

      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns 403 when non-admin user tries to access', async () => {
      setupNonAdminAuth()
      const req = makeRequest('http://localhost:3003/api/admin/recipes')
      const res = await GET(req)
      expect(res.status).toBe(403)
    })

    it('allows admin users to access', async () => {
      setupAdminAuth()
      mockCollectionGet.mockResolvedValue({
        docs: [],
        forEach: jest.fn(),
      })

      const req = makeRequest('http://localhost:3003/api/admin/recipes')
      const res = await GET(req)
      expect(res.status).toBe(200)
    })
  })

  // ==================== GET /api/admin/recipes ====================

  describe('GET /api/admin/recipes (list)', () => {
    beforeEach(() => {
      setupAdminAuth()
    })

    it('returns empty array when no recipes exist', async () => {
      mockCollectionGet.mockResolvedValue({
        docs: [],
        forEach: jest.fn(),
      })

      const req = makeRequest('http://localhost:3003/api/admin/recipes')
      const res = await GET(req)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.recipes).toEqual([])
      expect(body.count).toBe(0)
    })

    it('returns recipes from Firestore', async () => {
      const mockRecipes = [
        { id: 'r1', data: () => ({ id: 'r1', name: 'Recipe 1', createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) },
        { id: 'r2', data: () => ({ id: 'r2', name: 'Recipe 2', createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) },
      ]
      mockCollectionGet.mockResolvedValue({
        docs: mockRecipes,
        forEach: (fn: any) => mockRecipes.forEach(fn),
      })

      const req = makeRequest('http://localhost:3003/api/admin/recipes')
      const res = await GET(req)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.recipes).toHaveLength(2)
      expect(body.count).toBe(2)
    })

    it('filters by status when provided', async () => {
      mockCollectionGet.mockResolvedValue({ docs: [], forEach: jest.fn() })

      const req = makeRequest('http://localhost:3003/api/admin/recipes?status=draft')
      const res = await GET(req)
      const body = await res.json()

      // Should succeed and return empty results for draft filter
      expect(res.status).toBe(200)
      expect(body.recipes).toEqual([])
    })
  })

  // ==================== POST /api/admin/recipes ====================

  describe('POST /api/admin/recipes (create)', () => {
    beforeEach(() => {
      setupAdminAuth()
      mockSetDoc.mockResolvedValue(undefined)
    })

    it('creates a recipe with valid data', async () => {
      const recipeData = makeRecipeData()
      const req = makeRequest('http://localhost:3003/api/admin/recipes', {
        method: 'POST',
        body: JSON.stringify(recipeData),
      })

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.recipe.name).toBe('Test Recipe')
      expect(body.recipe.mealType).toBe('lunch')
    })

    it('returns 400 when name is missing', async () => {
      const req = makeRequest('http://localhost:3003/api/admin/recipes', {
        method: 'POST',
        body: JSON.stringify(makeRecipeData({ name: '' })),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 when mealType is missing', async () => {
      const req = makeRequest('http://localhost:3003/api/admin/recipes', {
        method: 'POST',
        body: JSON.stringify(makeRecipeData({ mealType: '' })),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 when no ingredients provided', async () => {
      const req = makeRequest('http://localhost:3003/api/admin/recipes', {
        method: 'POST',
        body: JSON.stringify(makeRecipeData({ ingredientsV2: null, ingredients: null })),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 when no recipe steps provided', async () => {
      const req = makeRequest('http://localhost:3003/api/admin/recipes', {
        method: 'POST',
        body: JSON.stringify(makeRecipeData({ recipeSteps: null })),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('accepts ingredients without ingredientsV2 (imported recipes)', async () => {
      const req = makeRequest('http://localhost:3003/api/admin/recipes', {
        method: 'POST',
        body: JSON.stringify(makeRecipeData({ ingredientsV2: undefined })),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
    })

    it('saves imageUrls when provided', async () => {
      const req = makeRequest('http://localhost:3003/api/admin/recipes', {
        method: 'POST',
        body: JSON.stringify(makeRecipeData({
          imageUrls: ['https://example.com/image.jpg']
        })),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockSetDoc).toHaveBeenCalled()
    })

    it('strips undefined values before saving', async () => {
      const { removeUndefinedValues } = require('@/lib/firestore-helpers')

      const req = makeRequest('http://localhost:3003/api/admin/recipes', {
        method: 'POST',
        body: JSON.stringify(makeRecipeData()),
      })

      await POST(req)
      expect(removeUndefinedValues).toHaveBeenCalled()
    })
  })

  // ==================== PUT /api/admin/recipes/[id] ====================

  describe('PUT /api/admin/recipes/[id] (update)', () => {
    beforeEach(() => {
      setupAdminAuth()
    })

    it('updates an existing recipe', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({ role: 'admin' })
      }).mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: RECIPE_ID, name: 'Old Name' })
      })
      mockUpdateDoc.mockResolvedValue(undefined)

      const req = makeRequest(`http://localhost:3003/api/admin/recipes/${RECIPE_ID}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      const context = { params: Promise.resolve({ id: RECIPE_ID }) }
      const res = await updateRecipe(req, context)

      expect(res.status).toBe(200)
    })

    it('returns 404 when recipe does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({ role: 'admin' })
      }).mockResolvedValueOnce({
        exists: false,
        data: () => null
      })

      const req = makeRequest(`http://localhost:3003/api/admin/recipes/${RECIPE_ID}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      })

      const context = { params: Promise.resolve({ id: RECIPE_ID }) }
      const res = await updateRecipe(req, context)

      expect(res.status).toBe(404)
    })
  })

  // ==================== STATUS TOGGLE (PUT) ====================

  describe('PUT /api/admin/recipes/[id] (status toggle)', () => {
    beforeEach(() => {
      setupAdminAuth()
    })

    it('publishes a draft recipe', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({ role: 'admin' })
      }).mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: RECIPE_ID, name: 'Draft Recipe', status: 'draft' })
      })
      mockUpdateDoc.mockResolvedValue(undefined)

      const req = makeRequest(`http://localhost:3003/api/admin/recipes/${RECIPE_ID}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'published' }),
      })

      const context = { params: Promise.resolve({ id: RECIPE_ID }) }
      const res = await updateRecipe(req, context)

      expect(res.status).toBe(200)
    })

    it('unpublishes a published recipe', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({ role: 'admin' })
      }).mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: RECIPE_ID, name: 'Published Recipe', status: 'published' })
      })
      mockUpdateDoc.mockResolvedValue(undefined)

      const req = makeRequest(`http://localhost:3003/api/admin/recipes/${RECIPE_ID}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'draft' }),
      })

      const context = { params: Promise.resolve({ id: RECIPE_ID }) }
      const res = await updateRecipe(req, context)

      expect(res.status).toBe(200)
    })

    it('archives a recipe', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({ role: 'admin' })
      }).mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: RECIPE_ID, name: 'Old Recipe', status: 'published' })
      })
      mockUpdateDoc.mockResolvedValue(undefined)

      const req = makeRequest(`http://localhost:3003/api/admin/recipes/${RECIPE_ID}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'archived' }),
      })

      const context = { params: Promise.resolve({ id: RECIPE_ID }) }
      const res = await updateRecipe(req, context)

      expect(res.status).toBe(200)
    })
  })

  // ==================== DELETE /api/admin/recipes/[id] ====================

  describe('DELETE /api/admin/recipes/[id]', () => {
    beforeEach(() => {
      setupAdminAuth()
    })

    it('deletes an existing recipe', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({ role: 'admin' })
      }).mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: RECIPE_ID, name: 'To Delete' })
      })
      mockDeleteDoc.mockResolvedValue(undefined)

      const req = makeRequest(`http://localhost:3003/api/admin/recipes/${RECIPE_ID}`, {
        method: 'DELETE',
      })

      const context = { params: Promise.resolve({ id: RECIPE_ID }) }
      const res = await deleteRecipe(req, context)

      expect(res.status).toBe(200)
    })

    it('returns 404 when recipe does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({ role: 'admin' })
      }).mockResolvedValueOnce({
        exists: false,
        data: () => null
      })

      const req = makeRequest(`http://localhost:3003/api/admin/recipes/${RECIPE_ID}`, {
        method: 'DELETE',
      })

      const context = { params: Promise.resolve({ id: RECIPE_ID }) }
      const res = await deleteRecipe(req, context)

      expect(res.status).toBe(404)
    })
  })

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    beforeEach(() => {
      setupAdminAuth()
      mockSetDoc.mockResolvedValue(undefined)
    })

    it('handles recipe with no macros gracefully', async () => {
      const req = makeRequest('http://localhost:3003/api/admin/recipes', {
        method: 'POST',
        body: JSON.stringify(makeRecipeData({ macros: undefined })),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
    })

    it('handles recipe with empty imageUrls array', async () => {
      const req = makeRequest('http://localhost:3003/api/admin/recipes', {
        method: 'POST',
        body: JSON.stringify(makeRecipeData({ imageUrls: [] })),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
    })

    it('handles multiple meal types via mealTypes field', async () => {
      const req = makeRequest('http://localhost:3003/api/admin/recipes', {
        method: 'POST',
        body: JSON.stringify(makeRecipeData({
          mealType: 'lunch',
          mealTypes: ['lunch', 'dinner']
        })),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
    })
  })
})
