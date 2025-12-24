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

import { Timestamp } from 'firebase/firestore'
import { normalizeToUTCMidnight, calculateDaysDifference } from '@/lib/vital-date-validator'
import type { Vital } from '@/types/medical'

export interface DuplicateVitalCheckResult {
  isDuplicate: boolean
  existingVital?: Vital
  message?: string
}

/**
 * Check if a vital entry already exists for the same type and date
 *
 * A duplicate is defined as:
 * - Same vital type (weight, bloodPressure, etc.)
 * - Same recordedAt date (normalized to UTC midnight)
 * - For the same patient
 *
 * @param existingVitals - Array of existing vitals for the patient
 * @param vitalType - Type of vital being logged
 * @param recordedAt - Date the vital was recorded
 * @returns DuplicateVitalCheckResult with duplicate status and details
 */
export function checkDuplicateVital(
  existingVitals: Vital[],
  vitalType: string,
  recordedAt: Date
): DuplicateVitalCheckResult {
  const normalizedRecorded = normalizeToUTCMidnight(recordedAt)

  // Find vitals of the same type
  const sameTypeVitals = existingVitals.filter(v => v.type === vitalType)

  // Check for duplicate on the same date
  for (const vital of sameTypeVitals) {
    const vitalDate = vital.recordedAt instanceof Timestamp
      ? vital.recordedAt.toDate()
      : new Date(vital.recordedAt)

    const normalizedVitalDate = normalizeToUTCMidnight(vitalDate)

    // Compare normalized dates
    if (normalizedVitalDate.getTime() === normalizedRecorded.getTime()) {
      return {
        isDuplicate: true,
        existingVital: vital,
        message: `A ${vitalType} entry already exists for ${normalizedRecorded.toLocaleDateString()}`
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
  existingVitals: Vital[],
  vitalType: string,
  recordedAt: Date,
  withinDays: number = 1
): Vital[] {
  const normalizedRecorded = normalizeToUTCMidnight(recordedAt)

  return existingVitals.filter(v => {
    if (v.type !== vitalType) return false

    const vitalDate = v.recordedAt instanceof Timestamp
      ? v.recordedAt.toDate()
      : new Date(v.recordedAt)

    const normalizedVitalDate = normalizeToUTCMidnight(vitalDate)
    const daysDiff = calculateDaysDifference(normalizedRecorded, normalizedVitalDate)

    return daysDiff > 0 && daysDiff <= withinDays
  })
}

/**
 * Sort vitals by recordedAt date (most recent first)
 */
export function sortVitalsByDate(vitals: Vital[]): Vital[] {
  return [...vitals].sort((a, b) => {
    const dateA = a.recordedAt instanceof Timestamp
      ? a.recordedAt.toDate()
      : new Date(a.recordedAt)

    const dateB = b.recordedAt instanceof Timestamp
      ? b.recordedAt.toDate()
      : new Date(b.recordedAt)

    return dateB.getTime() - dateA.getTime()
  })
}

/**
 * Get the most recent vital of a specific type
 */
export function getMostRecentVital(
  vitals: Vital[],
  vitalType: string
): Vital | null {
  const sameTypeVitals = vitals.filter(v => v.type === vitalType)
  if (sameTypeVitals.length === 0) return null

  const sorted = sortVitalsByDate(sameTypeVitals)
  return sorted[0]
}

/**
 * Filter vitals by date range
 */
export function filterVitalsByDateRange(
  vitals: Vital[],
  startDate: Date,
  endDate: Date
): Vital[] {
  const normalizedStart = normalizeToUTCMidnight(startDate)
  const normalizedEnd = normalizeToUTCMidnight(endDate)

  return vitals.filter(v => {
    const vitalDate = v.recordedAt instanceof Timestamp
      ? v.recordedAt.toDate()
      : new Date(v.recordedAt)

    const normalizedVitalDate = normalizeToUTCMidnight(vitalDate)

    return normalizedVitalDate >= normalizedStart && normalizedVitalDate <= normalizedEnd
  })
}
