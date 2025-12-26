/**
 * Patient Preferences Service
 *
 * Centralized service for managing patient preferences including vital reminders.
 * Handles merging, validation, and default initialization.
 *
 * Separation of Concerns:
 * - API routes call this service
 * - UI components call this service
 * - Business logic stays in one place
 */

import { deepMerge } from '@/lib/utils/deep-merge'

export type VitalReminderFrequency =
  | 'daily'
  | 'twice-daily'
  | 'three-times-daily'
  | 'four-times-daily'
  | 'weekly'
  | 'bi-weekly'
  | 'biweekly'
  | 'monthly'

export interface VitalReminderConfig {
  enabled: boolean
  frequency: VitalReminderFrequency
}

export interface PatientPreferences {
  vitalReminders?: Record<string, VitalReminderConfig>
  dietaryPreferences?: string[]
  notifications?: boolean
  [key: string]: any
}

/**
 * Safely merge new preferences into existing preferences
 * Preserves all nested data
 */
export function mergePatientPreferences(
  existing: PatientPreferences | null | undefined,
  updates: Partial<PatientPreferences>
): PatientPreferences {
  const base = existing || {}
  return deepMerge(base, updates)
}

/**
 * Initialize default preferences for a patient
 * Used when creating new patients or migrating old records
 */
export function initializeDefaultPreferences(
  legacyData?: {
    disableWeightReminders?: boolean
    weightCheckInFrequency?: string
  }
): PatientPreferences {
  return {
    vitalReminders: {
      weight: {
        enabled: legacyData?.disableWeightReminders !== true,
        frequency: (legacyData?.weightCheckInFrequency as any) || 'weekly'
      }
    }
  }
}

/**
 * Update a specific vital reminder setting
 * DRY helper to avoid duplicating this logic
 */
export function updateVitalReminder(
  existingPreferences: PatientPreferences | null | undefined,
  vitalType: string,
  config: VitalReminderConfig
): PatientPreferences {
  const current = existingPreferences || {}

  return {
    ...current,
    vitalReminders: {
      ...(current.vitalReminders || {}),
      [vitalType]: config
    }
  }
}

/**
 * Batch update multiple vital reminders at once
 */
export function updateVitalReminders(
  existingPreferences: PatientPreferences | null | undefined,
  vitalReminders: Record<string, VitalReminderConfig>
): PatientPreferences {
  return mergePatientPreferences(existingPreferences || {}, {
    vitalReminders
  })
}
