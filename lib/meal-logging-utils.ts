/**
 * Meal Logging Utilities
 *
 * Helper functions to parse and use meal logging preferences from onboarding
 */

import type { MealLoggingMode, MealLoggingOption } from '@/types'

/**
 * Check if user wants photo-based meal logging
 */
export function wantsPhotoLogging(mode: MealLoggingMode): boolean {
  if (Array.isArray(mode)) {
    return mode.includes('photo') || mode.includes('both')
  }
  return mode === 'photo' || mode === 'both'
}

/**
 * Check if user wants manual meal logging
 */
export function wantsManualLogging(mode: MealLoggingMode): boolean {
  if (Array.isArray(mode)) {
    return mode.includes('manual') || mode.includes('both')
  }
  return mode === 'manual' || mode === 'both'
}

/**
 * Check if user wants both photo and manual logging
 */
export function wantsBothLogging(mode: MealLoggingMode): boolean {
  if (Array.isArray(mode)) {
    return mode.includes('both') || (mode.includes('photo') && mode.includes('manual'))
  }
  return mode === 'both'
}

/**
 * Check if user wants meal logging reminders
 */
export function wantsReminders(mode: MealLoggingMode): boolean {
  if (Array.isArray(mode)) {
    return mode.includes('with_reminders')
  }
  return mode === 'with_reminders'
}

/**
 * Get the primary logging method
 * Returns the first non-reminder preference, or 'both' if multiple selected
 */
export function getPrimaryLoggingMethod(mode: MealLoggingMode): 'photo' | 'manual' | 'both' {
  if (Array.isArray(mode)) {
    const methods = mode.filter(m => m !== 'with_reminders')

    if (methods.includes('both')) return 'both'
    if (methods.includes('photo') && methods.includes('manual')) return 'both'
    if (methods.includes('photo')) return 'photo'
    if (methods.includes('manual')) return 'manual'

    // Default to both if only reminders selected
    return 'both'
  }

  if (mode === 'with_reminders') return 'both'
  return mode as 'photo' | 'manual' | 'both'
}

/**
 * Get user-friendly description of logging preferences
 */
export function getLoggingDescription(mode: MealLoggingMode): string {
  const primary = getPrimaryLoggingMethod(mode)
  const reminders = wantsReminders(mode)

  const methodText = {
    photo: 'Photo logging',
    manual: 'Manual logging',
    both: 'Photo and manual logging'
  }[primary]

  if (reminders) {
    return `${methodText} with meal reminders`
  }

  return methodText
}

/**
 * Example usage in a component:
 *
 * ```typescript
 * const { config } = useUIConfig()
 * const loggingMode = config?.onboardingAnswers?.mealLoggingMode
 *
 * if (wantsPhotoLogging(loggingMode)) {
 *   return <PhotoCapture />
 * }
 *
 * if (wantsManualLogging(loggingMode)) {
 *   return <ManualEntry />
 * }
 *
 * if (wantsReminders(loggingMode)) {
 *   // Enable meal time notifications
 *   scheduleNotifications()
 * }
 * ```
 */
