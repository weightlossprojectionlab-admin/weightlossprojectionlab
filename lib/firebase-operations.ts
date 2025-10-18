'use client'

import { auth } from './firebase'

// Helper function to get auth token for API calls
const getAuthToken = async () => {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User not authenticated')
  }
  return await user.getIdToken()
}

// Helper function to make authenticated API calls
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = await getAuthToken()

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    console.error('API Error:', errorData)

    // Include detailed error message if available
    const errorMessage = errorData.details || errorData.error || `HTTP ${response.status}`
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
  }) {
    return makeAuthenticatedRequest('/api/weight-logs', {
      method: 'POST',
      body: JSON.stringify(data),
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
    return makeAuthenticatedRequest(url)
  },

  // Create meal log
  async createMealLog(data: {
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    photoUrl?: string
    aiAnalysis?: any
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

// User Profile Operations
export const userProfileOperations = {
  // Create user profile after signup
  async createUserProfile(data: {
    email: string
    name: string
    preferences?: any
    goals?: any
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

  // Update user profile
  async updateUserProfile(data: any) {
    return makeAuthenticatedRequest('/api/user-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
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

export interface MealLogData {
  id: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  photoUrl?: string
  aiAnalysis?: any
  manualEntries?: Array<{
    food: string
    calories: number
    quantity: string
  }>
  totalCalories: number
  macros: {
    carbs: number
    protein: number
    fat: number
  }
  loggedAt: string
  source: string
  notes?: string
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