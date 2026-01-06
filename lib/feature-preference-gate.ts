/**
 * Feature Preference Gate System
 *
 * Hybrid feature gating that combines:
 * 1. Subscription-based access control (plan tier)
 * 2. Preference-based filtering (onboarding goals)
 *
 * This ensures users only see features they:
 * - Have subscription access to (plan tier)
 * - Actually want to use (expressed interest during onboarding)
 */

import { FeaturePreference } from '@/types'

/**
 * Maps onboarding feature preferences to technical feature gates
 *
 * This mapping defines which technical features should be visible
 * when a user selects specific goals during onboarding.
 */
export const PREFERENCE_TO_FEATURES: Record<FeaturePreference, string[]> = {
  // Weight Loss
  weight_loss: [
    'weight-tracking',
    'weight-history',
    'progress-charts',
    'meal-logging',
    'photo-logging',
    'meal-recognition',
    'basic-recipes',
    'recipe-search',
    'step-tracking',
    'basic-ai-coaching',
    'basic-dashboard',
  ],

  // Meal Planning (includes recipes)
  meal_planning: [
    'meal-logging',
    'photo-logging',
    'meal-recognition',
    'meal-gallery',
    'basic-recipes',
    'recipe-search',
    'inventory-management',
    'pantry-tracking',
    'barcode-scanning',
    'family-meal-planning',
    'shared-shopping',
  ],

  // Medical Tracking
  medical_tracking: [
    'appointments',
    'medications',
    'vitals-tracking',
    'providers',
    'medical-records',
    'health-insights',
    'trend-analysis',
  ],

  // Caregiving (Family mode)
  caregiving: [
    'multiple-patients',
    'patient-management',
    'family-directory',
    'household-management',
    'external-caregivers',
    'caregiver-invites',
    'family-health-dashboard',
  ],

  // Shopping Automation
  shopping_automation: [
    'inventory-management',
    'barcode-scanning',
    'pantry-tracking',
    'shared-shopping',
    'family-meal-planning',
  ],

  // Fitness
  fitness: [
    'step-tracking',
    'progress-charts',
    'weight-tracking',
    'trend-analysis',
  ],

  // Vitals
  vitals: [
    'vitals-tracking',
    'health-insights',
    'trend-analysis',
    'appointments',
    'providers',
  ],

  // Medications
  medications: [
    'medications',
    'appointments',
    'providers',
    'medical-records',
  ],
}

/**
 * Features that should ALWAYS be visible regardless of preferences
 * These are core features that every user needs
 */
export const ALWAYS_VISIBLE_FEATURES = [
  'basic-dashboard',
  'profile-settings',
  'preferences',
  'notifications',
]

/**
 * Check if a feature should be visible based on user's onboarding preferences
 *
 * @param feature - Technical feature identifier (e.g., 'appointments')
 * @param userPreferences - User's selected feature preferences from onboarding
 * @returns true if feature should be visible based on preferences
 *
 * Rules:
 * - If user has NO preferences set (legacy/incomplete onboarding), show ALL features
 * - If feature is in ALWAYS_VISIBLE_FEATURES, always return true
 * - Otherwise, check if any of user's preferences map to this feature
 */
export function shouldShowFeatureByPreference(
  feature: string,
  userPreferences: FeaturePreference[]
): boolean {
  // Backward compatibility: if no preferences, show everything
  if (!userPreferences || userPreferences.length === 0) {
    return true
  }

  // Always show core features
  if (ALWAYS_VISIBLE_FEATURES.includes(feature)) {
    return true
  }

  // Check if any user preference includes this feature
  return userPreferences.some(pref => {
    const features = PREFERENCE_TO_FEATURES[pref]
    return features && features.includes(feature)
  })
}

/**
 * Get all features that should be visible based on user preferences
 *
 * @param userPreferences - User's selected feature preferences from onboarding
 * @returns Array of feature identifiers that should be visible
 *
 * @example
 * getVisibleFeaturesByPreference(['weight_loss', 'fitness'])
 * // ['weight-tracking', 'step-tracking', 'progress-charts', ...]
 */
export function getVisibleFeaturesByPreference(
  userPreferences: FeaturePreference[]
): string[] {
  // Backward compatibility: if no preferences, show all features
  if (!userPreferences || userPreferences.length === 0) {
    return Object.values(PREFERENCE_TO_FEATURES).flat()
  }

  // Collect all features from user's preferences
  const featuresSet = new Set<string>(ALWAYS_VISIBLE_FEATURES)

  userPreferences.forEach(pref => {
    const features = PREFERENCE_TO_FEATURES[pref]
    if (features) {
      features.forEach(feature => featuresSet.add(feature))
    }
  })

  return Array.from(featuresSet)
}

/**
 * Get features that are hidden based on user preferences
 * Useful for showing upsell/discovery prompts
 *
 * @param userPreferences - User's selected feature preferences from onboarding
 * @returns Array of hidden feature identifiers
 */
export function getHiddenFeaturesByPreference(
  userPreferences: FeaturePreference[]
): string[] {
  // If no preferences, nothing is hidden
  if (!userPreferences || userPreferences.length === 0) {
    return []
  }

  const allFeatures = Object.values(PREFERENCE_TO_FEATURES).flat()
  const visibleFeatures = getVisibleFeaturesByPreference(userPreferences)

  return allFeatures.filter(feature => !visibleFeatures.includes(feature))
}

/**
 * Get feature preferences that would unlock a specific feature
 * Useful for showing "Enable X to unlock this feature" prompts
 *
 * @param feature - Technical feature identifier
 * @returns Array of feature preferences that include this feature
 *
 * @example
 * getPreferencesForFeature('appointments')
 * // ['medical_tracking', 'vitals', 'medications']
 */
export function getPreferencesForFeature(feature: string): FeaturePreference[] {
  const preferences: FeaturePreference[] = []

  for (const [pref, features] of Object.entries(PREFERENCE_TO_FEATURES)) {
    if (features.includes(feature)) {
      preferences.push(pref as FeaturePreference)
    }
  }

  return preferences
}

/**
 * Maps feature preferences to user-friendly display names
 */
export const PREFERENCE_DISPLAY_NAMES: Record<FeaturePreference, string> = {
  weight_loss: 'Weight Loss',
  meal_planning: 'Meal Planning & Recipes',
  medical_tracking: 'Medical Tracking',
  caregiving: 'Caregiving',
  shopping_automation: 'Shopping Automation',
  fitness: 'Fitness',
  vitals: 'Vital Signs',
  medications: 'Medications',
}

/**
 * Get display name for a feature preference
 *
 * @param preference - Feature preference identifier
 * @returns User-friendly display name
 */
export function getPreferenceDisplayName(preference: FeaturePreference): string {
  return PREFERENCE_DISPLAY_NAMES[preference] || preference
}
