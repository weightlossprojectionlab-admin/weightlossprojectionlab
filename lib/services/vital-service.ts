/**
 * Vital Service
 *
 * Centralized service for vital operations including duplicate detection.
 * Handles business logic for vital entries.
 *
 * Separation of Concerns:
 * - Business logic in service layer
 * - Used by API routes and UI components
 * - DRY - single source of truth for vital operations
 */

import { normalizeToUTCMidnight, calculateDaysDifference } from '@/lib/vital-date-validator'
import type { VitalSign } from '@/types/medical'

export interface DuplicateVitalCheckResult {
  isDuplicate: boolean
  existingVital?: VitalSign
  message?: string
}

/**
 * Check if a vital entry already exists for the same type at the same time.
 *
 * A duplicate is defined as:
 * - Same vital type (blood_sugar, blood_pressure, etc.)
 * - Same recordedAt instant, to the minute — NOT the same day. Vitals are
 *   legitimately taken multiple times per day at different times (fasting vs
 *   post-meal glucose; morning vs evening BP — a glucometer commonly logs
 *   several a day), so those must all be allowed. Minute granularity matches
 *   the time picker's precision and still blocks an accidental double-submit
 *   of the very same reading.
 * - For the same patient
 *
 * This single function gates both the client picker and the server POST route,
 * so the day→minute change fixes both at once.
 *
 * @param existingVitals - Array of existing vitals for the patient
 * @param vitalType - Type of vital being logged
 * @param recordedAt - Date+time the vital was recorded
 * @returns DuplicateVitalCheckResult with duplicate status and details
 */
export function checkDuplicateVital(
  existingVitals: VitalSign[],
  vitalType: string,
  recordedAt: Date
): DuplicateVitalCheckResult {
  const toMinute = (d: Date) => Math.floor(d.getTime() / 60000)
  const targetMinute = toMinute(recordedAt)

  // Find vitals of the same type
  const sameTypeVitals = existingVitals.filter(v => v.type === vitalType)

  // Check for duplicate at the same minute
  for (const vital of sameTypeVitals) {
    const vitalDate = new Date(vital.recordedAt)
    if (isNaN(vitalDate.getTime())) continue

    if (toMinute(vitalDate) === targetMinute) {
      return {
        isDuplicate: true,
        existingVital: vital,
        message: `A ${vitalType} reading already exists for ${recordedAt.toLocaleString()}`
      }
    }
  }

  return {
    isDuplicate: false
  }
}

/**
 * Check if there are vitals within a certain time range
 * Useful for warning users about entries on nearby dates
 *
 * @param existingVitals - Array of existing vitals for the patient
 * @param vitalType - Type of vital being logged
 * @param recordedAt - Date the vital was recorded
 * @param withinDays - Number of days to check before/after (default: 1)
 * @returns Array of vitals within the time range
 */
export function findNearbyVitals(
  existingVitals: VitalSign[],
  vitalType: string,
  recordedAt: Date,
  withinDays: number = 1
): VitalSign[] {
  const normalizedRecorded = normalizeToUTCMidnight(recordedAt)

  return existingVitals.filter(v => {
    if (v.type !== vitalType) return false

    const vitalDate = new Date(v.recordedAt)
    const normalizedVitalDate = normalizeToUTCMidnight(vitalDate)
    const daysDiff = calculateDaysDifference(normalizedRecorded, normalizedVitalDate)

    return daysDiff > 0 && daysDiff <= withinDays
  })
}

/**
 * Sort vitals by recordedAt date (most recent first)
 */
export function sortVitalsByDate(vitals: VitalSign[]): VitalSign[] {
  return [...vitals].sort((a, b) => {
    const dateA = new Date(a.recordedAt)
    const dateB = new Date(b.recordedAt)
    return dateB.getTime() - dateA.getTime()
  })
}

/**
 * Get the most recent vital of a specific type
 */
export function getMostRecentVital(
  vitals: VitalSign[],
  vitalType: string
): VitalSign | null {
  const sameTypeVitals = vitals.filter(v => v.type === vitalType)
  if (sameTypeVitals.length === 0) return null

  const sorted = sortVitalsByDate(sameTypeVitals)
  return sorted[0]
}

/**
 * Filter vitals by date range
 */
export function filterVitalsByDateRange(
  vitals: VitalSign[],
  startDate: Date,
  endDate: Date
): VitalSign[] {
  const normalizedStart = normalizeToUTCMidnight(startDate)
  const normalizedEnd = normalizeToUTCMidnight(endDate)

  return vitals.filter(v => {
    const vitalDate = new Date(v.recordedAt)
    const normalizedVitalDate = normalizeToUTCMidnight(vitalDate)

    return normalizedVitalDate >= normalizedStart && normalizedVitalDate <= normalizedEnd
  })
}
