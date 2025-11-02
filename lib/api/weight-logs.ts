/**
 * Weight Logs API Service
 * Type-safe API client for weight logging operations
 */

import { z } from 'zod'
import { apiClient, buildQueryString } from '../api-client'
import {
  WeightLogSchema,
  CreateWeightLogRequestSchema,
  GetWeightLogsQuerySchema,
  type WeightLog,
  type CreateWeightLogRequest,
  type GetWeightLogsQuery,
} from '../validations/weight-logs'

// ============================================
// API RESPONSE SCHEMAS
// ============================================

const WeightLogsResponseSchema = z.object({
  data: z.array(WeightLogSchema),
  count: z.number(),
})

const CreateWeightLogResponseSchema = z.object({
  data: WeightLogSchema,
  message: z.string(),
})

// ============================================
// API METHODS
// ============================================

/**
 * Fetch weight logs for the authenticated user
 */
export async function getWeightLogs(query: GetWeightLogsQuery = {}): Promise<WeightLog[]> {
  // Validate query parameters
  const validatedQuery = GetWeightLogsQuerySchema.parse(query)

  // Build query string
  const queryString = buildQueryString(validatedQuery)

  // Make request
  const response = await apiClient.get(
    `/weight-logs${queryString}`,
    WeightLogsResponseSchema
  )

  return response.data
}

/**
 * Create a new weight log
 */
export async function createWeightLog(data: CreateWeightLogRequest): Promise<WeightLog> {
  // Validate request data
  const validatedData = CreateWeightLogRequestSchema.parse(data)

  // Make request
  const response = await apiClient.post(
    '/weight-logs',
    validatedData,
    CreateWeightLogResponseSchema
  )

  return response.data
}

/**
 * Get the most recent weight log
 */
export async function getLatestWeightLog(): Promise<WeightLog | null> {
  const logs = await getWeightLogs({ limit: 1 })
  return logs.length > 0 ? logs[0] : null
}

/**
 * Get weight logs for a specific date range
 */
export async function getWeightLogsByDateRange(startDate: Date, endDate: Date): Promise<WeightLog[]> {
  return getWeightLogs({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  })
}

/**
 * Get weight trend for the last N days
 */
export async function getWeightTrend(days: number = 30): Promise<WeightLog[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return getWeightLogsByDateRange(startDate, endDate)
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert weight between units
 */
export function convertWeight(weight: number, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs'): number {
  if (fromUnit === toUnit) return weight

  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return weight * 2.20462
  } else {
    return weight / 2.20462
  }
}

/**
 * Calculate weight change between two logs
 */
export function calculateWeightChange(older: WeightLog, newer: WeightLog): number {
  // Convert to same unit if needed
  const olderWeight = older.unit === newer.unit
    ? older.weight
    : convertWeight(older.weight, older.unit, newer.unit)

  return newer.weight - olderWeight
}

/**
 * Calculate average weight from logs
 */
export function calculateAverageWeight(logs: WeightLog[], targetUnit: 'kg' | 'lbs' = 'lbs'): number {
  if (logs.length === 0) return 0

  const total = logs.reduce((sum, log) => {
    const weight = log.unit === targetUnit
      ? log.weight
      : convertWeight(log.weight, log.unit, targetUnit)
    return sum + weight
  }, 0)

  return total / logs.length
}
