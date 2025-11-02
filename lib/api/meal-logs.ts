/**
 * Meal Logs API Service
 * Type-safe API client for meal logging operations
 */

import { z } from 'zod'
import { apiClient, buildQueryString } from '../api-client'
import {
  MealLogSchema,
  CreateMealLogRequestSchema,
  UpdateMealLogRequestSchema,
  GetMealLogsQuerySchema,
  type MealLog,
  type CreateMealLogRequest,
  type GetMealLogsQuery,
} from '../validations/meal-logs'

// ============================================
// API RESPONSE SCHEMAS
// ============================================

const MealLogsResponseSchema = z.object({
  data: z.array(MealLogSchema),
  count: z.number(),
})

const CreateMealLogResponseSchema = z.object({
  data: MealLogSchema,
  message: z.string(),
})

// ============================================
// API METHODS
// ============================================

/**
 * Fetch meal logs for the authenticated user
 */
export async function getMealLogs(query: Partial<GetMealLogsQuery> = {}): Promise<MealLog[]> {
  // Validate query parameters with explicit defaults
  const validatedQuery = GetMealLogsQuerySchema.parse({
    limit: 50,
    ...query,
  })

  // Build query string
  const queryString = buildQueryString(validatedQuery)

  // Make request
  const response = await apiClient.get(
    `/meal-logs${queryString}`,
    MealLogsResponseSchema
  )

  return response.data
}

/**
 * Create a new meal log
 */
export async function createMealLog(data: CreateMealLogRequest): Promise<MealLog> {
  // Validate request data
  const validatedData = CreateMealLogRequestSchema.parse(data)

  // Make request
  const response = await apiClient.post(
    '/meal-logs',
    validatedData,
    CreateMealLogResponseSchema
  )

  return response.data
}

/**
 * Get a specific meal log by ID
 */
export async function getMealLog(id: string): Promise<MealLog> {
  return apiClient.get(
    `/meal-logs/${id}`,
    MealLogSchema
  )
}

/**
 * Update a meal log
 */
export async function updateMealLog(id: string, data: Partial<CreateMealLogRequest>): Promise<MealLog> {
  // Validate partial update data
  const validatedData = UpdateMealLogRequestSchema.partial().parse(data)

  return apiClient.patch(
    `/meal-logs/${id}`,
    validatedData,
    MealLogSchema
  )
}

/**
 * Delete a meal log
 */
export async function deleteMealLog(id: string): Promise<void> {
  await apiClient.delete(`/meal-logs/${id}`)
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get meal logs for today
 */
export async function getTodaysMealLogs(): Promise<MealLog[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return getMealLogs({
    startDate: today.toISOString(),
    endDate: tomorrow.toISOString(),
  })
}

/**
 * Get meal logs for a specific date range
 */
export async function getMealLogsByDateRange(startDate: Date, endDate: Date): Promise<MealLog[]> {
  return getMealLogs({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  })
}

/**
 * Get meal logs by meal type
 */
export async function getMealLogsByType(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'): Promise<MealLog[]> {
  return getMealLogs({
    mealType,
  })
}
