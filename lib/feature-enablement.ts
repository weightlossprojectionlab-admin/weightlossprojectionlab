/**
 * Feature Enablement System
 *
 * Handles user intent for enabling features across:
 * - Onboarding (initial selection)
 * - Dashboard/Profile "Enable" buttons
 * - Post-upgrade auto-enablement
 *
 * KEY CONCEPT: User intent is preserved throughout the journey
 */

import { canAccessFeature } from './feature-gates'
import { userProfileOperations } from './firebase-operations'
import { logger } from './logger'
import type { User, FeaturePreference } from '@/types'

/**
 * Check if user can enable a feature based on their subscription
 */
export function canEnableFeature(user: User | null, feature: FeaturePreference): {
  canEnable: boolean
  requiresUpgrade: boolean
  reason?: string
} {
  if (!user) {
    return { canEnable: false, requiresUpgrade: true, reason: 'Not authenticated' }
  }

  // Map feature preferences to feature gate checks
  const featureGateMapping: Record<string, string> = {
    'health_medical': 'medications', // Check if user can access medical features
    'body_fitness': 'weight-tracking', // Body/fitness available on all plans
    'nutrition_kitchen': 'meal-logging' // Nutrition available on all plans
  }

  const gateToCheck = featureGateMapping[feature] || feature

  // Check subscription-based access
  const hasAccess = canAccessFeature(user, gateToCheck)

  if (!hasAccess) {
    return {
      canEnable: false,
      requiresUpgrade: true,
      reason: `Requires subscription upgrade to access ${feature} features`
    }
  }

  return { canEnable: true, requiresUpgrade: false }
}

/**
 * Enable a feature for the user (add to preferences)
 * This is UI-only - doesn't grant subscription access
 */
export async function enableFeature(
  currentPreferences: FeaturePreference[],
  newFeature: FeaturePreference,
  onboardingAnswers: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Don't add duplicate
    if (currentPreferences.includes(newFeature)) {
      return { success: true }
    }

    // Add to preferences
    const updatedFeatures = [...currentPreferences, newFeature]

    await userProfileOperations.updateUserProfile({
      preferences: {
        onboardingAnswers: {
          ...onboardingAnswers,
          featurePreferences: updatedFeatures
        }
      }
    })

    logger.info(`[FeatureEnablement] Enabled feature: ${newFeature}`)

    return { success: true }
  } catch (error) {
    logger.error(`[FeatureEnablement] Failed to enable ${newFeature}`, error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enable feature'
    }
  }
}

/**
 * Track user's intent to enable a feature (for post-upgrade enablement)
 * Stored in Firestore so it works across devices
 */
export async function trackFeatureIntent(
  userId: string,
  feature: FeaturePreference,
  returnUrl?: string
): Promise<void> {
  try {
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
    const { db } = await import('./firebase')

    // Store in Firestore users/{uid}/pendingFeatureIntent
    await setDoc(doc(db, 'users', userId), {
      pendingFeatureIntent: {
        feature,
        timestamp: serverTimestamp(),
        returnUrl: returnUrl || '/profile',
        // Auto-expire after 24 hours (checked by webhook/client)
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    }, { merge: true })

    logger.info(`[FeatureEnablement] Tracked intent in Firestore for: ${feature}`)
  } catch (error) {
    logger.error('[FeatureEnablement] Failed to track intent', error as Error)
  }
}

/**
 * Retrieve pending feature intent from Firestore
 */
export async function getPendingFeatureIntent(userId: string): Promise<{
  feature: FeaturePreference
  returnUrl: string
} | null> {
  try {
    const { doc, getDoc } = await import('firebase/firestore')
    const { db } = await import('./firebase')

    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) return null

    const data = userDoc.data()
    const intent = data?.pendingFeatureIntent

    if (!intent) return null

    // Check expiration
    const expiresAt = intent.expiresAt?.toDate?.() || new Date(intent.expiresAt)
    if (expiresAt < new Date()) {
      logger.info('[FeatureEnablement] Intent expired, clearing')
      await clearFeatureIntent(userId)
      return null
    }

    return {
      feature: intent.feature,
      returnUrl: intent.returnUrl || '/profile'
    }
  } catch (error) {
    logger.error('[FeatureEnablement] Failed to get intent', error as Error)
    return null
  }
}

/**
 * Clear pending feature intent from Firestore
 */
export async function clearFeatureIntent(userId: string): Promise<void> {
  try {
    const { doc, updateDoc, deleteField } = await import('firebase/firestore')
    const { db } = await import('./firebase')

    await updateDoc(doc(db, 'users', userId), {
      pendingFeatureIntent: deleteField()
    })

    logger.info('[FeatureEnablement] Cleared feature intent')
  } catch (error) {
    logger.error('[FeatureEnablement] Failed to clear intent', error as Error)
  }
}

/**
 * Get user-friendly messages for feature enablement
 */
export function getFeatureMessages(feature: FeaturePreference): {
  title: string
  description: string
  upgradeMessage: string
  successMessage: string
} {
  const messages: Record<FeaturePreference, any> = {
    'body_fitness': {
      title: 'Track Body & Fitness Goals',
      description: 'Track weight, exercise, body composition, and fitness goals - whether gaining, losing, or maintaining.',
      upgradeMessage: 'Body & Fitness tracking is included in all plans. Enable it now!',
      successMessage: 'Body & Fitness enabled! Your dashboard will refresh automatically.'
    },
    'health_medical': {
      title: 'Track Health & Medical Records',
      description: 'Track appointments, medications, vital signs (blood pressure, glucose, etc.), and health records all in one place.',
      upgradeMessage: 'Health & Medical tracking requires Single Plus or higher. Upgrade to unlock!',
      successMessage: 'Health & Medical enabled! Your medical tracking features are now available.'
    },
    'nutrition_kitchen': {
      title: 'Master Nutrition & Kitchen',
      description: 'Plan meals with WPL Vision™, discover recipes, smart shopping lists, and pantry tracking all in one place.',
      upgradeMessage: 'Nutrition & Kitchen features are included in all plans. Enable it now!',
      successMessage: 'Nutrition & Kitchen enabled! Your meal planning tools are ready.'
    }
  }

  return messages[feature] || {
    title: 'Enable Feature',
    description: 'Enable this feature to unlock new capabilities.',
    upgradeMessage: 'This feature may require an upgraded subscription.',
    successMessage: 'Feature enabled successfully!'
  }
}

/**
 * Get the minimum required plan for a feature
 */
export function getRequiredPlanForFeature(feature: FeaturePreference): string {
  const planRequirements: Record<FeaturePreference, string> = {
    'health_medical': 'Single Plus',
    'body_fitness': 'All plans',
    'nutrition_kitchen': 'All plans'
  }

  return planRequirements[feature] || 'Unknown'
}
