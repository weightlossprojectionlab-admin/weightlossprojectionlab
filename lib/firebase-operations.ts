'use client'

import { logger } from '@/lib/logger'
import { auth, db } from './firebase'
import { getCSRFToken } from '@/lib/csrf'
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore'
import type { AIAnalysis, UserPreferences, UserGoals, UserProfile, CookingSession, QueuedRecipe } from '@/types'
import { JsonObject, getErrorMessage } from '@/types/common'

// Token cache to reduce getIdToken() calls (tokens expire after 1 hour, we cache for 55 min)
let cachedToken: string | null = null
let tokenExpiry: number = 0

// Helper function to get auth token for API calls (with retry for race conditions)
const getAuthToken = async () => {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    logger.debug('[FirebaseOps] Using cached auth token')
    return cachedToken
  }

  let user = auth.currentUser

  if (!user) {
    // Wait briefly for Firebase Auth to initialize, then retry
    logger.debug('[FirebaseOps] Auth not ready, waiting 200ms and retrying...')
    await new Promise(resolve => setTimeout(resolve, 200))
    user = auth.currentUser

    if (!user) {
      logger.error('[FirebaseOps] User still not authenticated after retry')
      throw new Error('User not authenticated - please log in again')
    }
  }

  logger.debug('[FirebaseOps] Getting fresh auth token for user', { userId: user.uid })
  const token = await user.getIdToken()

  // Cache token for 55 minutes (tokens are valid for 60 minutes)
  cachedToken = token
  tokenExpiry = Date.now() + (55 * 60 * 1000)

  return token
}

// Helper function to make authenticated API calls
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = await getAuthToken()
  const csrfToken = getCSRFToken()

  // DEBUG: Log CSRF token retrieval
  console.log('[FirebaseOps] Making authenticated request', {
    url,
    method: options.method || 'GET',
    hasCsrfToken: !!csrfToken,
    csrfTokenLength: csrfToken?.length,
    csrfTokenPreview: csrfToken?.substring(0, 10) + '...'
  })

  // Build headers carefully to ensure CSRF token isn't overridden
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
    // ALWAYS include CSRF token last so it can't be overridden
    'X-CSRF-Token': csrfToken,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // AGGRESSIVE DEBUG: Log response status IMMEDIATELY
  console.log('[FirebaseOps] Response received:', {
    url,
    status: response?.status,
    statusText: response?.statusText,
    ok: response?.ok,
    method: options.method || 'GET'
  })

  if (!response.ok) {
    // AGGRESSIVE DEBUG: Log error path entry
    console.log('[FirebaseOps] Response not OK, entering error handler', {
      status: response.status,
      statusText: response.statusText,
      url,
      method: options.method || 'GET'
    })

    // Try to parse error response
    let errorData: any = { error: 'Unknown error' }
    let parseError: string | undefined

    try {
      // Clone response before reading to avoid "body already read" errors
      const clonedResponse = response.clone()
      errorData = await clonedResponse.json()
      console.log('[FirebaseOps] Parsed error JSON:', JSON.stringify(errorData, null, 2))
    } catch (e) {
      parseError = getErrorMessage(e)
      console.log('[FirebaseOps] Failed to parse JSON, error:', parseError)
      // Try to get response text as fallback
      try {
        const text = await response.text()
        console.log('[FirebaseOps] Response text fallback:', text)
        if (text) errorData = { error: text }
      } catch {
        console.log('[FirebaseOps] Failed to get text too')
        // Keep default error
      }
    }

    // Build comprehensive error context
    const errorContext = {
      url,
      method: options.method || 'GET',
      status: response.status,
      statusText: response.statusText,
      errorData: JSON.stringify(errorData),
      ...(parseError && { parseError }),
    }

    // Extract detailed error message
    const errorMessage = errorData.details || errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`

    // For validation errors, include field details
    const fullErrorMessage = errorData.details && Array.isArray(errorData.details)
      ? `${errorMessage} - ${JSON.stringify(errorData.details)}`
      : errorMessage

    // DIRECT console.error to bypass logger serialization issues
    console.error('[FirebaseOps] API Error Details:', {
      url,
      method: options.method || 'GET',
      status: response.status,
      statusText: response.statusText,
      errorMessage: fullErrorMessage,
      errorData
    })

    logger.error('[FirebaseOps] API Error', new Error(fullErrorMessage), errorContext)

    // Include detailed error message if available
    throw new Error(errorMessage)
  }

  return response.json()
}

// Weight Log Operations
export const weightLogOperations = {
  // Get weight logs
  async getWeightLogs(params?: {
    limit?: number
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)

    const url = `/api/weight-logs${searchParams.toString() ? `?${searchParams}` : ''}`
    return makeAuthenticatedRequest(url)
  },

  // Create weight log
  async createWeightLog(data: {
    weight: number
    unit: 'kg' | 'lbs'
    notes?: string
    loggedAt?: string
    dataSource?: 'bluetooth-scale' | 'photo-verified' | 'manual'
    photoUrl?: string
    scaleDeviceId?: string
  }) {
    return makeAuthenticatedRequest('/api/weight-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update weight log
  async updateWeightLog(weightLogId: string, data: {
    weight?: number
    unit?: 'kg' | 'lbs'
    notes?: string
    loggedAt?: string
  }) {
    return makeAuthenticatedRequest(`/api/weight-logs/${weightLogId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  // Delete weight log
  async deleteWeightLog(weightLogId: string) {
    return makeAuthenticatedRequest(`/api/weight-logs/${weightLogId}`, {
      method: 'DELETE',
    })
  },
}

// Meal Log Operations
export const mealLogOperations = {
  // Get meal logs
  async getMealLogs(params?: {
    limit?: number
    startDate?: string
    endDate?: string
    mealType?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)
    if (params?.mealType) searchParams.set('mealType', params.mealType)

    const url = `/api/meal-logs${searchParams.toString() ? `?${searchParams}` : ''}`
    console.log('[FirebaseOps] getMealLogs - params:', params)
    console.log('[FirebaseOps] getMealLogs - URL:', url)
    return makeAuthenticatedRequest(url)
  },

  // Create meal log
  async createMealLog(data: {
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    photoUrl?: string
    additionalPhotos?: string[]
    aiAnalysis?: AIAnalysis
    manualEntries?: Array<{
      food: string
      calories: number
      quantity: string
    }>
    notes?: string
    loggedAt?: string
  }) {
    return makeAuthenticatedRequest('/api/meal-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update meal log
  async updateMealLog(mealLogId: string, data: {
    description?: string
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    notes?: string
    aiAnalysis?: AIAnalysis
    manualEntries?: Array<{
      food: string
      calories: number
      quantity: string
    }>
  }) {
    return makeAuthenticatedRequest(`/api/meal-logs/${mealLogId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Delete meal log
  async deleteMealLog(mealLogId: string) {
    return makeAuthenticatedRequest(`/api/meal-logs/${mealLogId}`, {
      method: 'DELETE',
    })
  },
}

// Step Log Operations
export const stepLogOperations = {
  // Get step logs
  async getStepLogs(params?: {
    limit?: number
    startDate?: string
    endDate?: string
    source?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)
    if (params?.source) searchParams.set('source', params.source)

    const url = `/api/step-logs${searchParams.toString() ? `?${searchParams}` : ''}`
    return makeAuthenticatedRequest(url)
  },

  // Create step log
  async createStepLog(data: {
    steps: number
    date: string // YYYY-MM-DD format
    source?: 'device' | 'health-app' | 'manual' | 'apple-health' | 'google-fit'
    goal?: number
    notes?: string
    loggedAt?: string
  }) {
    return makeAuthenticatedRequest('/api/step-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Meal Template Operations
export const mealTemplateOperations = {
  // Get all meal templates
  async getMealTemplates() {
    return makeAuthenticatedRequest('/api/meal-templates')
  },

  // Create meal template
  async createMealTemplate(data: {
    name: string
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    foodItems: string[]
    calories: number
    macros: {
      protein: number
      carbs: number
      fat: number
      fiber: number
    }
    notes?: string
  }) {
    return makeAuthenticatedRequest('/api/meal-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Delete meal template
  async deleteMealTemplate(templateId: string) {
    return makeAuthenticatedRequest(`/api/meal-templates/${templateId}`, {
      method: 'DELETE',
    })
  },

  // Increment template usage count
  async recordTemplateUsage(templateId: string) {
    return makeAuthenticatedRequest(`/api/meal-templates/${templateId}`, {
      method: 'PUT',
    })
  },
}

// User Profile Operations
export const userProfileOperations = {
  // Create user profile after signup
  async createUserProfile(data: {
    email: string
    name: string
    preferences?: UserPreferences
    goals?: UserGoals
  }) {
    return makeAuthenticatedRequest('/api/user-profile', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Get user profile
  async getUserProfile() {
    return makeAuthenticatedRequest('/api/user-profile')
  },

  // Update user profile (including onboarding data)
  async updateUserProfile(data: Partial<{
    profile?: Partial<UserProfile>
    goals?: Partial<UserGoals>
    preferences?: Partial<UserPreferences>
    name?: string
    email?: string
  }>) {
    return makeAuthenticatedRequest('/api/user-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Reset all user data (nuclear option - deletes everything and starts fresh)
  async resetAllData() {
    return makeAuthenticatedRequest('/api/user-profile/reset', {
      method: 'DELETE',
    })
  },
}

// Utility functions for data formatting
export const formatters = {
  // Format date for API calls (YYYY-MM-DD)
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  },

  // Format date-time for API calls (ISO string)
  formatDateTime(date: Date): string {
    return date.toISOString()
  },

  // Convert weight between units
  convertWeight(weight: number, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs'): number {
    if (fromUnit === toUnit) return weight

    if (fromUnit === 'kg' && toUnit === 'lbs') {
      return weight * 2.20462
    } else if (fromUnit === 'lbs' && toUnit === 'kg') {
      return weight / 2.20462
    }

    return weight
  },

  // Calculate BMI
  calculateBMI(weightKg: number, heightCm: number): number {
    const heightM = heightCm / 100
    return weightKg / (heightM * heightM)
  },
}

// Error handling helper
export class FirebaseOperationError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'FirebaseOperationError'
  }
}

// Type definitions for better TypeScript support
export interface WeightLogData {
  id: string
  weight: number
  unit: 'kg' | 'lbs'
  loggedAt: string
  notes?: string
  source: string
}

export interface StepLogData {
  id: string
  steps: number
  date: string
  source: string
  loggedAt: string
  goal?: number
  notes?: string
}

// Cooking Session Operations
export const cookingSessionOperations = {
  // Create a new cooking session
  createCookingSession: async (sessionData: Omit<CookingSession, 'id' | 'userId'>) => {
    const user = auth.currentUser
    if (!user) throw new FirebaseOperationError('User must be authenticated')

    try {
      const sessionRef = doc(collection(db, 'cooking-sessions'))
      const session = {
        ...sessionData,
        userId: user.uid,
        id: sessionRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await setDoc(sessionRef, session)
      return { ...session, id: sessionRef.id, createdAt: new Date(), updatedAt: new Date() }
    } catch (error: unknown) {
      logger.error('[FirebaseOps] Error creating cooking session', error as Error)
      throw new FirebaseOperationError(`Failed to create cooking session: ${getErrorMessage(error)}`)
    }
  },

  // Get active cooking session
  getActiveCookingSession: async () => {
    const user = auth.currentUser
    if (!user) throw new FirebaseOperationError('User must be authenticated')

    try {
      const q = query(
        collection(db, 'cooking-sessions'),
        where('userId', '==', user.uid),
        where('status', 'in', ['in-progress', 'paused']),
        orderBy('startedAt', 'desc'),
        limit(1)
      )

      const snapshot = await getDocs(q)
      if (snapshot.empty) return null

      const doc = snapshot.docs[0]
      return { ...doc.data(), id: doc.id }
    } catch (error: unknown) {
      logger.error('[FirebaseOps] Error getting active cooking session', error as Error)
      throw new FirebaseOperationError(`Failed to get cooking session: ${getErrorMessage(error)}`)
    }
  },

  // Get cooking session by ID
  getCookingSession: async (sessionId: string) => {
    try {
      const sessionRef = doc(db, 'cooking-sessions', sessionId)
      const sessionDoc = await getDoc(sessionRef)

      if (!sessionDoc.exists()) {
        throw new FirebaseOperationError('Cooking session not found')
      }

      return { ...sessionDoc.data(), id: sessionDoc.id }
    } catch (error: unknown) {
      logger.error('[FirebaseOps] Error getting cooking session', error as Error)
      throw new FirebaseOperationError(`Failed to get cooking session: ${getErrorMessage(error)}`)
    }
  },

  // Update cooking session
  updateCookingSession: async (sessionId: string, updates: Partial<CookingSession>) => {
    const user = auth.currentUser
    if (!user) throw new FirebaseOperationError('User must be authenticated')

    try {
      const sessionRef = doc(db, 'cooking-sessions', sessionId)
      await updateDoc(sessionRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
    } catch (error: unknown) {
      logger.error('[FirebaseOps] Error updating cooking session', error as Error)
      throw new FirebaseOperationError(`Failed to update cooking session: ${getErrorMessage(error)}`)
    }
  },

  // Delete cooking session
  deleteCookingSession: async (sessionId: string) => {
    const user = auth.currentUser
    if (!user) throw new FirebaseOperationError('User must be authenticated')

    try {
      const sessionRef = doc(db, 'cooking-sessions', sessionId)
      await deleteDoc(sessionRef)
    } catch (error: unknown) {
      logger.error('[FirebaseOps] Error deleting cooking session', error as Error)
      throw new FirebaseOperationError(`Failed to delete cooking session: ${getErrorMessage(error)}`)
    }
  }
}

// Recipe Queue Operations
export const recipeQueueOperations = {
  // Add recipe to queue
  addToQueue: async (queueData: Omit<QueuedRecipe, 'id' | 'userId' | 'addedAt'>) => {
    const user = auth.currentUser
    if (!user) throw new FirebaseOperationError('User must be authenticated')

    try {
      const queueRef = doc(collection(db, 'recipe-queue'))
      const queueItem = {
        ...queueData,
        userId: user.uid,
        id: queueRef.id,
        addedAt: serverTimestamp()
      }

      await setDoc(queueRef, queueItem)
      return { ...queueItem, id: queueRef.id, addedAt: new Date() }
    } catch (error: unknown) {
      logger.error('[FirebaseOps] Error adding to recipe queue', error as Error)
      throw new FirebaseOperationError(`Failed to add to queue: ${getErrorMessage(error)}`)
    }
  },

  // Get user's recipe queue
  getQueue: async () => {
    const user = auth.currentUser
    if (!user) throw new FirebaseOperationError('User must be authenticated')

    try {
      const q = query(
        collection(db, 'recipe-queue'),
        where('userId', '==', user.uid),
        orderBy('addedAt', 'desc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
    } catch (error: unknown) {
      logger.error('[FirebaseOps] Error getting recipe queue', error as Error)
      throw new FirebaseOperationError(`Failed to get queue: ${getErrorMessage(error)}`)
    }
  },

  // Remove from queue
  removeFromQueue: async (queueId: string) => {
    const user = auth.currentUser
    if (!user) throw new FirebaseOperationError('User must be authenticated')

    try {
      const queueRef = doc(db, 'recipe-queue', queueId)
      await deleteDoc(queueRef)
    } catch (error: unknown) {
      logger.error('[FirebaseOps] Error removing from queue', error as Error)
      throw new FirebaseOperationError(`Failed to remove from queue: ${getErrorMessage(error)}`)
    }
  }
}

// Re-export real-time hooks from hooks directory for backwards compatibility
export { useMealLogsRealtime, type MealLogData } from '@/hooks/useMealLogs'