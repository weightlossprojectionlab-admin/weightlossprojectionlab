/**
 * Vital Date Validation Service
 *
 * Centralized service for validating vital recording dates.
 * Handles timezone normalization, backdate limits, and business rules.
 *
 * Separation of Concerns:
 * - Date validation logic in one place
 * - Used by API routes and UI components
 * - Enforces platform-wide business rules
 */

import { Timestamp } from 'firebase/firestore'

export interface VitalDateValidationResult {
  isValid: boolean
  error?: string
  normalizedDate?: Date
  isBackdated?: boolean
  daysDifference?: number
}

export interface BackdateLimits {
  free: number      // 7 days
  premium: number   // 90 days
  enterprise: number // 365 days
}

export const BACKDATE_LIMITS: BackdateLimits = {
  free: 7,
  premium: 90,
  enterprise: 365
}

/**
 * Normalize date to UTC midnight
 * Prevents timezone drift and ensures consistent date comparisons
 */
export function normalizeToUTCMidnight(date: Date): Date {
  const normalized = new Date(date)
  normalized.setUTCHours(0, 0, 0, 0)
  return normalized
}

/**
 * Calculate days difference between two dates (normalized to UTC midnight)
 */
export function calculateDaysDifference(date1: Date, date2: Date): number {
  const norm1 = normalizeToUTCMidnight(date1)
  const norm2 = normalizeToUTCMidnight(date2)
  const diffMs = Math.abs(norm2.getTime() - norm1.getTime())
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Check if vital entry is considered backdated (logged > 1 hour after recorded)
 */
export function isVitalBackdated(recordedAt: Date, loggedAt: Date): boolean {
  const diffMs = loggedAt.getTime() - recordedAt.getTime()
  const oneHourMs = 60 * 60 * 1000
  return diffMs > oneHourMs
}

/**
 * Validate vital recording date against business rules
 *
 * Rules:
 * 1. Cannot be in the future
 * 2. Cannot be before patient creation date
 * 3. Cannot exceed backdate limit for user's plan tier
 * 4. Must be a valid date
 */
export function validateVitalDate(
  recordedAt: Date,
  patientCreatedAt: Date | Timestamp,
  userPlanTier: 'free' | 'premium' | 'enterprise' = 'free',
  currentTime: Date = new Date()
): VitalDateValidationResult {
  // Normalize all dates to UTC midnight for comparison
  const normalizedRecorded = normalizeToUTCMidnight(recordedAt)
  const normalizedNow = normalizeToUTCMidnight(currentTime)

  // Convert Firestore Timestamp to Date if needed
  const patientCreated = patientCreatedAt instanceof Timestamp
    ? patientCreatedAt.toDate()
    : patientCreatedAt
  const normalizedCreated = normalizeToUTCMidnight(patientCreated)

  // Rule 1: Cannot be in the future
  if (normalizedRecorded > normalizedNow) {
    return {
      isValid: false,
      error: 'Cannot record vitals for future dates'
    }
  }

  // Rule 2: Cannot be before patient creation
  if (normalizedRecorded < normalizedCreated) {
    return {
      isValid: false,
      error: 'Cannot record vitals before patient profile was created'
    }
  }

  // Rule 3: Check backdate limit
  const daysDiff = calculateDaysDifference(normalizedRecorded, normalizedNow)
  const maxBackdateDays = BACKDATE_LIMITS[userPlanTier]

  if (daysDiff > maxBackdateDays) {
    return {
      isValid: false,
      error: `Cannot backdate vitals more than ${maxBackdateDays} days (your plan limit). Upgrade to backdate further.`,
      daysDifference: daysDiff
    }
  }

  // Check if this is considered a backdated entry
  const isBackdated = isVitalBackdated(normalizedRecorded, currentTime)

  return {
    isValid: true,
    normalizedDate: normalizedRecorded,
    isBackdated,
    daysDifference: daysDiff
  }
}

/**
 * Get user-friendly error message for date validation failures
 */
export function getDateValidationErrorMessage(
  result: VitalDateValidationResult,
  userPlanTier: 'free' | 'premium' | 'enterprise'
): string {
  if (result.isValid) {
    return ''
  }

  if (result.error) {
    return result.error
  }

  return 'Invalid date selected'
}

/**
 * Check if user can backdate to a specific date based on their plan
 */
export function canBackdateToDate(
  targetDate: Date,
  userPlanTier: 'free' | 'premium' | 'enterprise',
  currentTime: Date = new Date()
): boolean {
  const daysDiff = calculateDaysDifference(targetDate, currentTime)
  return daysDiff <= BACKDATE_LIMITS[userPlanTier]
}

/**
 * Get maximum allowed backdate date for a user's plan tier
 */
export function getMaxBackdateDate(
  userPlanTier: 'free' | 'premium' | 'enterprise',
  currentTime: Date = new Date()
): Date {
  const maxDays = BACKDATE_LIMITS[userPlanTier]
  const maxDate = new Date(currentTime)
  maxDate.setDate(maxDate.getDate() - maxDays)
  return normalizeToUTCMidnight(maxDate)
}
