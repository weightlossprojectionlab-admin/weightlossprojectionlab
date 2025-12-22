/**
 * Onboarding Router - State Machine Logic
 *
 * Manages intelligent routing during onboarding based on:
 * - User's current subscription tier
 * - Selected features and goals
 * - Upgrade recommendations
 */

import { SubscriptionPlan, UserSubscription, FeaturePreference } from '@/types'
import type { User as FirebaseUser } from 'firebase/auth'
import { canAccessFeature } from './feature-gates'
import { PLAN_FEATURES, ADDON_FEATURES, BASIC_FEATURES } from './feature-gates'

export type OnboardingState =
  | 'role_selection'
  | 'goals'
  | 'upgrade_prompt'
  | 'food_management'
  | 'logging_preference'
  | 'automation'
  | 'family_setup'
  | 'complete'

export interface OnboardingContext {
  currentState: OnboardingState
  answers: Record<string, any>
  subscription: UserSubscription | null
  user: FirebaseUser | null
  needsUpgrade: boolean
  recommendedPlan: SubscriptionPlan | null
  blockedFeatures: string[]
}

// Map goals to required features
const GOAL_TO_FEATURE_MAP: Record<string, string[]> = {
  'medical_tracking': ['appointments', 'medications', 'medical-records'],
  'vitals': ['vitals-tracking'],
  'medications': ['medications'],
  'caregiving': ['multiple-patients', 'patient-management'],
}

/**
 * Determine if user needs an upgrade based on selected goals
 */
export function shouldShowUpgradePrompt(
  selectedGoals: string[],
  user: FirebaseUser | null,
  subscription: UserSubscription | null
): { needsUpgrade: boolean; blockedFeatures: string[] } {
  const blockedFeatures: string[] = []

  if (!subscription || subscription.status === 'expired' || subscription.status === 'canceled') {
    // No valid subscription - all premium features are blocked
    return {
      needsUpgrade: true,
      blockedFeatures: selectedGoals.filter(goal => GOAL_TO_FEATURE_MAP[goal]?.length > 0)
    }
  }

  for (const goal of selectedGoals) {
    const requiredFeatures = GOAL_TO_FEATURE_MAP[goal]

    if (requiredFeatures && requiredFeatures.length > 0) {
      const hasAccess = requiredFeatures.some(feature => {
        // Check basic features (available to all active/trialing plans)
        if (BASIC_FEATURES.includes(feature)) {
          return subscription.status === 'active' || subscription.status === 'trialing'
        }

        // Check plan-gated features
        if (PLAN_FEATURES[feature]) {
          return PLAN_FEATURES[feature].includes(subscription.plan)
        }

        // Check addon-gated features
        if (ADDON_FEATURES[feature]) {
          const requiredAddon = ADDON_FEATURES[feature]
          return subscription.addons?.[requiredAddon] === true
        }

        // Feature not recognized - default to denied
        return false
      })

      if (!hasAccess) {
        blockedFeatures.push(goal)
      }
    }
  }

  return {
    needsUpgrade: blockedFeatures.length > 0,
    blockedFeatures
  }
}

/**
 * Recommend appropriate plan based on blocked features
 */
export function getRecommendedPlan(
  blockedFeatures: string[],
  currentPlan: SubscriptionPlan
): SubscriptionPlan | null {
  if (blockedFeatures.length === 0) return null

  // Check what features are blocked
  const needsMedical = blockedFeatures.some(f =>
    ['medical_tracking', 'vitals', 'medications'].includes(f)
  )
  const needsCaregiving = blockedFeatures.includes('caregiving')

  // Current plan upgrade path
  if (currentPlan === 'free' || currentPlan === 'single') {
    if (needsMedical && !needsCaregiving) {
      return 'single_plus' // Medical features only
    }
    if (needsCaregiving || (needsMedical && needsCaregiving)) {
      return 'family_basic' // Multiple patients + medical
    }
  }

  if (currentPlan === 'single_plus') {
    if (needsCaregiving) {
      return 'family_basic' // Need multiple patient support
    }
  }

  // Already on a family plan or no clear upgrade path
  return null
}

/**
 * Get next state in the onboarding flow
 */
export function getNextState(
  currentState: OnboardingState,
  context: OnboardingContext
): OnboardingState {
  switch (currentState) {
    case 'role_selection':
      return 'goals'

    case 'goals':
      // Check if upgrade prompt should be shown
      if (context.needsUpgrade && context.recommendedPlan) {
        return 'upgrade_prompt'
      }
      return 'food_management'

    case 'upgrade_prompt':
      // After upgrade prompt, continue with regular flow
      return 'food_management'

    case 'food_management':
      return 'logging_preference'

    case 'logging_preference':
      return 'automation'

    case 'automation':
      // Show family setup only if user selected family mode or caregiving
      const userMode = context.answers.userMode
      const hasFamily = userMode === 'household' || userMode === 'caregiver'
      if (hasFamily) {
        return 'family_setup'
      }
      return 'complete'

    case 'family_setup':
      return 'complete'

    case 'complete':
      return 'complete'

    default:
      return 'role_selection'
  }
}

/**
 * Get previous state in the onboarding flow
 */
export function getPreviousState(
  currentState: OnboardingState,
  context: OnboardingContext
): OnboardingState | null {
  switch (currentState) {
    case 'role_selection':
      return null // First screen

    case 'goals':
      return 'role_selection'

    case 'upgrade_prompt':
      return 'goals'

    case 'food_management':
      // Skip upgrade prompt on back navigation
      return 'goals'

    case 'logging_preference':
      return 'food_management'

    case 'automation':
      return 'logging_preference'

    case 'family_setup':
      return 'automation'

    case 'complete':
      const userMode = context.answers.userMode
      const hasFamily = userMode === 'household' || userMode === 'caregiver'
      if (hasFamily) {
        return 'family_setup'
      }
      return 'automation'

    default:
      return null
  }
}

/**
 * Calculate onboarding progress percentage
 */
export function calculateProgress(
  currentState: OnboardingState,
  context: OnboardingContext
): number {
  const states: OnboardingState[] = [
    'role_selection',
    'goals',
    ...(context.needsUpgrade ? ['upgrade_prompt' as OnboardingState] : []),
    'food_management',
    'logging_preference',
    'automation',
    ...(context.answers.userMode === 'household' || context.answers.userMode === 'caregiver'
      ? ['family_setup' as OnboardingState]
      : []),
  ]

  const currentIndex = states.indexOf(currentState)
  if (currentIndex === -1) return 0

  return Math.round(((currentIndex + 1) / states.length) * 100)
}

/**
 * Validate that all required fields are completed for current state
 */
export function canAdvanceFromState(
  currentState: OnboardingState,
  context: OnboardingContext
): boolean {
  switch (currentState) {
    case 'role_selection':
      return !!context.answers.role_selection

    case 'goals':
      const goals = context.answers.goals as string[] || []
      return goals.length > 0

    case 'upgrade_prompt':
      return true // Can always continue from upgrade prompt

    case 'food_management':
      return !!context.answers.food_management

    case 'logging_preference':
      return !!context.answers.logging_preference

    case 'automation':
      return !!context.answers.automation

    case 'family_setup':
      return !!context.answers.family_setup

    default:
      return false
  }
}

/**
 * Filter selected goals to only include accessible features
 */
export function filterAccessibleGoals(
  selectedGoals: string[],
  subscription: UserSubscription | null
): string[] {
  if (!subscription || subscription.status === 'expired' || subscription.status === 'canceled') {
    // No valid subscription - only allow goals that don't require features
    return selectedGoals.filter(goal => !GOAL_TO_FEATURE_MAP[goal] || GOAL_TO_FEATURE_MAP[goal].length === 0)
  }

  return selectedGoals.filter(goal => {
    const requiredFeatures = GOAL_TO_FEATURE_MAP[goal]

    // If goal doesn't map to a gated feature, allow it
    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true
    }

    // Check if user has access to at least one required feature
    return requiredFeatures.some(feature => {
      // Check basic features (available to all active/trialing plans)
      if (BASIC_FEATURES.includes(feature)) {
        return subscription.status === 'active' || subscription.status === 'trialing'
      }

      // Check plan-gated features
      if (PLAN_FEATURES[feature]) {
        return PLAN_FEATURES[feature].includes(subscription.plan)
      }

      // Check addon-gated features
      if (ADDON_FEATURES[feature]) {
        const requiredAddon = ADDON_FEATURES[feature]
        return subscription.addons?.[requiredAddon] === true
      }

      // Feature not recognized - default to denied
      return false
    })
  })
}
