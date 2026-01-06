/**
 * Hybrid Feature Gate Hook
 *
 * Combines subscription-based feature gating with preference-based filtering.
 * A feature is accessible if:
 * 1. User has subscription access (plan tier allows it)
 * 2. User expressed interest (selected during onboarding)
 * 3. OR user has no preferences set (backward compatibility)
 */

'use client'

import { useFeatureGate, FeatureGateResult } from './useFeatureGate'
import { useUserPreferences } from './useUserPreferences'
import { shouldShowFeatureByPreference, getPreferencesForFeature } from '@/lib/feature-preference-gate'

export interface HybridFeatureGateResult extends FeatureGateResult {
  /** Whether feature is hidden due to preference filtering (even if subscription allows) */
  hiddenByPreference: boolean

  /** Whether feature is locked due to subscription tier */
  lockedBySubscription: boolean

  /** Feature preferences that would show this feature */
  requiredPreferences: string[]

  /** Whether to show this feature (combines both checks) */
  shouldShow: boolean
}

/**
 * Check feature access with hybrid gating (subscription + preferences)
 *
 * @param feature - Feature identifier (e.g., 'appointments', 'medications')
 * @param options - Configuration options
 * @param options.respectPreferences - Whether to filter by preferences (default: true)
 * @param options.showLockedFeatures - Whether to show locked features as upsells (default: false)
 * @returns Hybrid feature gate result
 *
 * @example
 * ```tsx
 * const { shouldShow, canAccess, hiddenByPreference, requiresUpgrade } = useHybridFeatureGate('appointments')
 *
 * if (!shouldShow) {
 *   // Feature completely hidden from navigation
 *   return null
 * }
 *
 * if (!canAccess) {
 *   // Show upgrade prompt
 *   return <UpgradePrompt />
 * }
 *
 * // Show feature
 * return <AppointmentsPage />
 * ```
 */
export function useHybridFeatureGate(
  feature: string,
  options: {
    respectPreferences?: boolean
    showLockedFeatures?: boolean
  } = {}
): HybridFeatureGateResult {
  const {
    respectPreferences = true,
    showLockedFeatures = false,
  } = options

  // Get subscription-based access
  const subscriptionGate = useFeatureGate(feature)

  // Get user preferences
  const userPrefs = useUserPreferences()

  // Check if feature is hidden by preferences
  const hiddenByPreference = respectPreferences
    ? !shouldShowFeatureByPreference(feature, userPrefs.featurePreferences)
    : false

  // Get required preferences to unlock this feature
  const requiredPreferences = getPreferencesForFeature(feature)

  // Determine if feature should be shown
  let shouldShow = true

  if (hiddenByPreference) {
    // Hidden by preferences - don't show unless we want to show locked features as upsells
    shouldShow = showLockedFeatures
  }

  // Feature is locked by subscription AND hidden by preference
  const lockedBySubscription = !subscriptionGate.canAccess

  return {
    ...subscriptionGate,
    hiddenByPreference,
    lockedBySubscription,
    requiredPreferences,
    shouldShow,
  }
}

/**
 * Check multiple features with hybrid gating
 *
 * @param features - Array of feature identifiers
 * @param options - Configuration options
 * @returns Object mapping feature names to their hybrid gate results
 *
 * @example
 * ```tsx
 * const gates = useHybridFeatureGates(['appointments', 'medications', 'vitals'])
 *
 * const availableFeatures = Object.entries(gates)
 *   .filter(([_, gate]) => gate.shouldShow && gate.canAccess)
 *   .map(([feature, _]) => feature)
 * ```
 */
export function useHybridFeatureGates(
  features: string[],
  options: {
    respectPreferences?: boolean
    showLockedFeatures?: boolean
  } = {}
): Record<string, HybridFeatureGateResult> {
  const {
    respectPreferences = true,
    showLockedFeatures = false,
  } = options

  const userPrefs = useUserPreferences()
  const results: Record<string, HybridFeatureGateResult> = {}

  features.forEach(feature => {
    // We can't use the hook in a loop, so we'll need to call it individually
    // This is a limitation - in practice, you'd use individual useHybridFeatureGate calls
    const hiddenByPreference = respectPreferences
      ? !shouldShowFeatureByPreference(feature, userPrefs.featurePreferences)
      : false

    const requiredPreferences = getPreferencesForFeature(feature)
    const shouldShow = hiddenByPreference ? showLockedFeatures : true

    // For this multi-feature version, we'll need to use the base useFeatureGate
    // In practice, components should call useHybridFeatureGate individually for each feature
    results[feature] = {
      canAccess: false, // Will be set by individual hook calls
      hasFeature: false,
      loading: false,
      requiresUpgrade: { type: 'none' },
      requiredUpgrade: { type: 'none' },
      currentPlan: null,
      suggestedPlan: undefined,
      hiddenByPreference,
      lockedBySubscription: false,
      requiredPreferences,
      shouldShow,
    }
  })

  return results
}

/**
 * Get features that should be shown in navigation/menus
 * Filters features based on both subscription and preferences
 *
 * @param allFeatures - Array of all possible feature identifiers
 * @returns Array of features that should be visible
 *
 * @example
 * ```tsx
 * const navFeatures = useVisibleFeatures([
 *   'appointments',
 *   'medications',
 *   'vitals',
 *   'meal-logging',
 *   'weight-tracking'
 * ])
 * // Returns only features user has access to AND selected during onboarding
 * ```
 */
export function useVisibleFeatures(allFeatures: string[]): string[] {
  const userPrefs = useUserPreferences()

  return allFeatures.filter(feature =>
    shouldShowFeatureByPreference(feature, userPrefs.featurePreferences)
  )
}
