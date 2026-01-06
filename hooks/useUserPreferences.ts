'use client'

import { useState, useEffect, useMemo } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
  OnboardingAnswers,
  UserMode,
  KitchenMode,
  MealLoggingMode,
  AutomationLevel,
  FeaturePreference
} from '@/types'

/**
 * Centralized hook for accessing user's onboarding preferences
 *
 * Storage location: users/{uid}/preferences.onboardingAnswers
 *
 * This hook provides:
 * - Raw onboarding answers
 * - Type-safe helper functions for common checks
 * - Cached data to prevent excessive Firestore reads
 */
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<OnboardingAnswers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          setLoading(false)
          return
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          const onboardingAnswers = data?.preferences?.onboardingAnswers

          if (onboardingAnswers) {
            setPreferences(onboardingAnswers as OnboardingAnswers)
            logger.debug('✅ Loaded user preferences:', {
              userMode: onboardingAnswers.userMode,
              featurePreferences: onboardingAnswers.featurePreferences,
              mealLoggingMode: onboardingAnswers.mealLoggingMode,
              kitchenMode: onboardingAnswers.kitchenMode,
              automationLevel: onboardingAnswers.automationLevel
            })
          } else {
            logger.warn('⚠️ No onboarding answers found for user')
            setPreferences(null)
          }
        }
      } catch (err) {
        logger.error('Error fetching user preferences:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchPreferences()
  }, [])

  // Helper functions using useMemo to prevent recalculation on every render
  const helpers = useMemo(() => {
    if (!preferences) {
      return {
        // Default helpers when no preferences exist
        wantsPhotoLogging: () => false,
        wantsManualLogging: () => true,
        wantsReminders: () => false,
        isSingleUser: () => true,
        isHouseholdMode: () => false,
        isCaregiverMode: () => false,
        isProfessional: () => false,
        hasFeature: (feature: FeaturePreference) => false,
        wantsAutomation: () => false,
        getTopFeature: () => null as FeaturePreference | null,
        getAllFeatures: () => [] as FeaturePreference[],
        getKitchenMode: () => null as KitchenMode | null,
        getMealLoggingPreferences: () => ({
          photo: false,
          manual: true,
          both: false,
          reminders: false
        })
      }
    }

    return {
      /**
       * Check if user prefers photo-based meal logging
       */
      wantsPhotoLogging: () => {
        const mode = preferences.mealLoggingMode
        if (Array.isArray(mode)) {
          return mode.includes('photo') || mode.includes('both')
        }
        return mode === 'photo' || mode === 'both'
      },

      /**
       * Check if user prefers manual meal logging
       */
      wantsManualLogging: () => {
        const mode = preferences.mealLoggingMode
        if (Array.isArray(mode)) {
          return mode.includes('manual') || mode.includes('both')
        }
        return mode === 'manual' || mode === 'both'
      },

      /**
       * Check if user wants meal time reminders
       */
      wantsReminders: () => {
        const mode = preferences.mealLoggingMode
        if (Array.isArray(mode)) {
          return mode.includes('with_reminders')
        }
        return mode === 'with_reminders'
      },

      /**
       * Check if user is in single-user mode
       */
      isSingleUser: () => preferences.userMode === 'single',

      /**
       * Check if user is in household mode
       */
      isHouseholdMode: () => preferences.userMode === 'household',

      /**
       * Check if user is in caregiver mode
       */
      isCaregiverMode: () => preferences.userMode === 'caregiver',

      /**
       * Check if user is a professional caregiver
       */
      isProfessional: () => preferences.primaryRole === 'caregiver',

      /**
       * Check if user selected a specific feature preference
       */
      hasFeature: (feature: FeaturePreference) => {
        return preferences.featurePreferences.includes(feature)
      },

      /**
       * Check if user wants high automation
       */
      wantsAutomation: () => preferences.automationLevel === 'yes',

      /**
       * Get user's top priority feature (first in array)
       */
      getTopFeature: () => {
        return preferences.featurePreferences[0] || null
      },

      /**
       * Get all selected feature preferences
       */
      getAllFeatures: () => {
        return preferences.featurePreferences
      },

      /**
       * Get kitchen mode setting
       */
      getKitchenMode: () => {
        return preferences.kitchenMode
      },

      /**
       * Get detailed meal logging preferences
       */
      getMealLoggingPreferences: () => {
        const mode = preferences.mealLoggingMode
        const modes = Array.isArray(mode) ? mode : [mode]

        return {
          photo: modes.includes('photo') || modes.includes('both'),
          manual: modes.includes('manual') || modes.includes('both'),
          both: modes.includes('both'),
          reminders: modes.includes('with_reminders')
        }
      }
    }
  }, [preferences])

  return {
    preferences,
    loading,
    error,
    ...helpers
  }
}
