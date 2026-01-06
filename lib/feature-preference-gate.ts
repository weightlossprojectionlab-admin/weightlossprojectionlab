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
 *
 * BACKWARD COMPATIBILITY:
 * - Supports legacy preference names (weight_loss, fitness, meal_planning, etc.)
 * - Automatically maps old preferences to new 3-pillar structure
 * - No migration required for existing users
 */

import { FeaturePreference } from '@/types'

/**
 * Legacy preference mapping for backward compatibility
 * Maps old 5-goal system to new 3-pillar system
 */
export const LEGACY_PREFERENCE_MAP: Record<string, FeaturePreference> = {
  // Old weight_loss and fitness → body_fitness
  'weight_loss': 'body_fitness',
  'fitness': 'body_fitness',

  // Old meal_planning and shopping_automation → nutrition_kitchen
  'meal_planning': 'nutrition_kitchen',
  'shopping_automation': 'nutrition_kitchen',

  // Old medical_tracking, vitals, medications → health_medical
  'medical_tracking': 'health_medical',
  'vitals': 'health_medical',
  'medications': 'health_medical',
}

/**
 * Normalize preferences array to use new 3-pillar names
 * Handles backward compatibility by mapping legacy names
 *
 * @param preferences - User's preferences (may include legacy names)
 * @returns Normalized array using only new pillar names
 */
export function normalizePreferences(preferences: string[]): FeaturePreference[] {
  if (!preferences || preferences.length === 0) {
    return []
  }

  const normalized = new Set<FeaturePreference>()

  preferences.forEach(pref => {
    // Check if it's a legacy preference that needs mapping
    const mapped = LEGACY_PREFERENCE_MAP[pref]
    if (mapped) {
      normalized.add(mapped)
    } else if (isValidNewPreference(pref)) {
      // It's already a new pillar name
      normalized.add(pref as FeaturePreference)
    }
    // Silently ignore unknown preferences
  })

  return Array.from(normalized)
}

/**
 * Check if a preference is a valid new pillar name
 */
function isValidNewPreference(pref: string): boolean {
  return ['body_fitness', 'nutrition_kitchen', 'health_medical', 'caregiving'].includes(pref)
}

/**
 * Maps onboarding feature preferences to technical feature gates
 *
 * This mapping defines which technical features should be visible
 * when a user selects specific goals during onboarding.
 */
export const PREFERENCE_TO_FEATURES: Record<FeaturePreference, string[]> = {
  // Body & Fitness (merged: weight_loss + fitness)
  body_fitness: [
    'weight-tracking',
    'weight-history',
    'progress-charts',
    'step-tracking',
    'exercise-tracking',
    'body-composition',
    'fitness-challenges',
    'trend-analysis',
    'basic-ai-coaching',
    'basic-dashboard',
  ],

  // Nutrition & Kitchen (merged: meal_planning + shopping_automation)
  nutrition_kitchen: [
    'meal-logging',
    'photo-logging',
    'meal-recognition',
    'meal-gallery',
    'basic-recipes',
    'recipe-search',
    'recipe-discovery',
    'inventory-management',
    'pantry-tracking',
    'barcode-scanning',
    'shopping-lists',
    'shared-shopping',
    'family-meal-planning',
  ],

  // Health & Medical (previously: medical_tracking)
  health_medical: [
    'appointments',
    'medications',
    'vitals-tracking',
    'providers',
    'medical-records',
    'health-insights',
    'trend-analysis',
    'symptom-tracking',
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
  body_fitness: 'Body & Fitness',
  nutrition_kitchen: 'Nutrition & Kitchen',
  health_medical: 'Health & Medical',
  caregiving: 'Caregiving',
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
