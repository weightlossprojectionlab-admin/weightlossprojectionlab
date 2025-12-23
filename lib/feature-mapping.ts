/**
 * Feature Mapping System
 *
 * Maps marketing-friendly feature names to technical feature gate identifiers.
 * This allows product/marketing teams to reference features by business names
 * while maintaining technical consistency in the codebase.
 */

import { User, HOUSEHOLD_LIMITS, HOUSEHOLD_DUTY_LIMITS } from '@/types'
import { canAccessFeature } from './feature-gates'

/**
 * Mapping of marketing feature names to technical feature gate IDs
 *
 * Marketing features are high-level capabilities shown to users in pricing pages,
 * marketing materials, and feature comparison tables. Each marketing feature
 * maps to one or more technical feature gates that control access.
 */
export const MARKETING_TO_TECHNICAL_FEATURES: Record<string, string[]> = {
  // Basic Health Tracking
  'basic-health-tracking': [
    'weight-tracking',
    'step-tracking',
    'basic-dashboard',
    'progress-charts',
    'weight-history',
  ],

  // Meal Logging & Recipes
  'meal-logging-recipes': [
    'meal-logging',
    'photo-logging',
    'meal-recognition',
    'basic-recipes',
    'recipe-search',
    'meal-gallery',
  ],

  // Multi-Person Tracking
  'track-humans-pets': [
    'multiple-patients',
    'pet-tracking',
    'patient-management',
    'family-directory',
  ],

  // Inventory & Pantry
  'inventory-pantry': [
    'inventory-management',
    'barcode-scanning',
    'pantry-tracking',
  ],

  // Medical Records
  'medical-records': [
    'medications',
    'vitals-tracking',
    'appointments',
    'providers',
    'medical-records',
  ],

  // External Caregivers
  'external-caregivers': [
    'external-caregivers',
    'caregiver-invites',
  ],

  // Family Features
  'family-features': [
    'household-management',
    'family-directory',
    'role-management',
    'shared-shopping',
    'family-meal-planning',
  ],

  // Household Care Management (NEW)
  'household-care-management': [
    'household-management',
    'household-duties',
    'duty-notifications',
    'duty-action-items',
  ],

  // Family Health Dashboard
  'family-health-dashboard': [
    'family-health-dashboard',
    'patient-management',
  ],

  // Advanced Analytics
  'advanced-analytics': [
    'advanced-analytics',
    'health-insights',
    'trend-analysis',
  ],

  // Enhanced AI Coaching
  'enhanced-ai-coaching': [
    'enhanced-ai-coaching',
    'predictive-ai',
  ],

  // Premium Support
  'premium-support': [
    'priority-support',
    'white-glove-service',
  ],

  // Data & Integration
  'data-integration': [
    'data-export',
    'api-access',
    'custom-reports',
  ],

  // Early Access
  'early-access': [
    'early-access',
  ],
}

/**
 * Reverse mapping: technical features to marketing features
 * Generated automatically from MARKETING_TO_TECHNICAL_FEATURES
 */
export const TECHNICAL_TO_MARKETING_FEATURES: Record<string, string[]> = (() => {
  const reverseMap: Record<string, string[]> = {}

  for (const [marketingFeature, technicalFeatures] of Object.entries(
    MARKETING_TO_TECHNICAL_FEATURES
  )) {
    for (const technicalFeature of technicalFeatures) {
      if (!reverseMap[technicalFeature]) {
        reverseMap[technicalFeature] = []
      }
      reverseMap[technicalFeature].push(marketingFeature)
    }
  }

  return reverseMap
})()

/**
 * Marketing feature descriptions for tooltips and documentation
 */
export const MARKETING_FEATURE_DESCRIPTIONS: Record<string, string> = {
  'basic-health-tracking':
    'Track your weight, steps, and view progress charts with basic dashboard features.',

  'meal-logging-recipes':
    'Log meals with photos, get AI-powered nutrition analysis, and access recipe database.',

  'track-humans-pets':
    'Manage health tracking for multiple family members and pets in one account.',

  'inventory-pantry':
    'Track your pantry inventory with barcode scanning and ingredient management.',

  'medical-records':
    'Store and manage medications, vitals, appointments, and healthcare provider information.',

  'external-caregivers':
    'Invite professional caregivers and healthcare providers to help manage care.',

  'family-features':
    'Full household management with shared shopping lists, meal planning, and role-based access.',

  'household-care-management':
    'Organize household responsibilities with task tracking, reminders, and shopping integration.',

  'family-health-dashboard':
    'Unified dashboard to monitor health metrics across all family members in one view.',

  'advanced-analytics':
    'Deep insights into health trends with predictive analytics and personalized recommendations.',

  'enhanced-ai-coaching':
    'Advanced AI-powered coaching with personalized meal plans and health guidance.',

  'premium-support':
    'Priority customer support with white-glove onboarding and dedicated assistance.',

  'data-integration':
    'Export your data, access APIs, and generate custom health reports.',

  'early-access':
    'Get early access to new features and beta programs before general release.',
}

/**
 * Check if user has access to a marketing feature
 * A user has access to a marketing feature if they have access to ALL
 * technical features that comprise that marketing feature.
 *
 * @param user - Current user
 * @param marketingFeature - Marketing feature name (e.g., 'family-health-dashboard')
 * @returns true if user has access to all technical features for this marketing feature
 *
 * @example
 * hasMarketingFeature(user, 'basic-health-tracking')  // true if has all basic tracking features
 * hasMarketingFeature(user, 'enhanced-ai-coaching')   // true only for Family Plus/Premium
 */
export function hasMarketingFeature(user: User | null, marketingFeature: string): boolean {
  if (!user) return false

  const technicalFeatures = MARKETING_TO_TECHNICAL_FEATURES[marketingFeature]
  if (!technicalFeatures || technicalFeatures.length === 0) {
    console.warn(`[FeatureMapping] Unknown marketing feature: ${marketingFeature}`)
    return false
  }

  // User must have access to ALL technical features
  return technicalFeatures.every((technicalFeature) =>
    canAccessFeature(user, technicalFeature)
  )
}

/**
 * Check if user has partial access to a marketing feature
 * Returns true if user has access to at least ONE technical feature
 * that comprises the marketing feature.
 *
 * @param user - Current user
 * @param marketingFeature - Marketing feature name
 * @returns true if user has access to at least one technical feature
 *
 * @example
 * hasPartialMarketingFeature(user, 'family-features')
 * // true if user has shared-shopping but not role-management
 */
export function hasPartialMarketingFeature(user: User | null, marketingFeature: string): boolean {
  if (!user) return false

  const technicalFeatures = MARKETING_TO_TECHNICAL_FEATURES[marketingFeature]
  if (!technicalFeatures || technicalFeatures.length === 0) {
    return false
  }

  // User must have access to at least ONE technical feature
  return technicalFeatures.some((technicalFeature) =>
    canAccessFeature(user, technicalFeature)
  )
}

/**
 * Get all marketing features available to a user
 *
 * @param user - Current user
 * @returns Array of marketing feature names the user has access to
 *
 * @example
 * getAvailableMarketingFeatures(user)
 * // ['basic-health-tracking', 'meal-logging-recipes', 'family-features', ...]
 */
export function getAvailableMarketingFeatures(user: User | null): string[] {
  if (!user) return []

  return Object.keys(MARKETING_TO_TECHNICAL_FEATURES).filter((marketingFeature) =>
    hasMarketingFeature(user, marketingFeature)
  )
}

/**
 * Get marketing features the user does NOT have access to
 * Useful for displaying upgrade prompts
 *
 * @param user - Current user
 * @returns Array of marketing feature names the user lacks access to
 *
 * @example
 * getUnavailableMarketingFeatures(user)
 * // ['enhanced-ai-coaching', 'premium-support', 'data-integration']
 */
export function getUnavailableMarketingFeatures(user: User | null): string[] {
  if (!user) return Object.keys(MARKETING_TO_TECHNICAL_FEATURES)

  return Object.keys(MARKETING_TO_TECHNICAL_FEATURES).filter(
    (marketingFeature) => !hasMarketingFeature(user, marketingFeature)
  )
}

/**
 * Get technical features that comprise a marketing feature
 *
 * @param marketingFeature - Marketing feature name
 * @returns Array of technical feature gate IDs
 *
 * @example
 * getTechnicalFeaturesForMarketing('family-health-dashboard')
 * // ['family-health-dashboard', 'patient-management']
 */
export function getTechnicalFeaturesForMarketing(marketingFeature: string): string[] {
  return MARKETING_TO_TECHNICAL_FEATURES[marketingFeature] || []
}

/**
 * Get marketing features that include a technical feature
 *
 * @param technicalFeature - Technical feature gate ID
 * @returns Array of marketing feature names
 *
 * @example
 * getMarketingFeaturesForTechnical('patient-management')
 * // ['track-humans-pets', 'family-health-dashboard']
 */
export function getMarketingFeaturesForTechnical(technicalFeature: string): string[] {
  return TECHNICAL_TO_MARKETING_FEATURES[technicalFeature] || []
}

/**
 * Get feature comparison matrix for pricing page
 * Returns a structured comparison of features across all plans
 *
 * @returns Feature comparison data structure
 *
 * @example
 * const matrix = getFeatureComparisonMatrix()
 * // {
 * //   'basic-health-tracking': {
 * //     free: true,
 * //     single: true,
 * //     family_basic: true,
 * //     family_plus: true,
 * //     family_premium: true
 * //   },
 * //   ...
 * // }
 */
export function getFeatureComparisonMatrix(): Record<
  string,
  Record<string, boolean>
> {
  const plans = ['free', 'single', 'family_basic', 'family_plus', 'family_premium'] as const
  const matrix: Record<string, Record<string, boolean>> = {}

  for (const marketingFeature of Object.keys(MARKETING_TO_TECHNICAL_FEATURES)) {
    matrix[marketingFeature] = {}

    for (const plan of plans) {
      // Create a mock user with the plan to test access
      const mockUser: User = {
        id: 'test',
        email: 'test@example.com',
        name: 'Test User',
        preferences: {
          units: 'imperial',
          notifications: true,
          biometricEnabled: false,
          themePreference: 'system',
        },
        subscription: {
          plan,
          billingInterval: 'monthly',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          maxSeats: 1,
          currentSeats: 0,
          maxExternalCaregivers: 0,
          currentExternalCaregivers: 0,
          maxHouseholds: HOUSEHOLD_LIMITS[plan] || 1,
          currentHouseholds: 0,
          maxDutiesPerHousehold: HOUSEHOLD_DUTY_LIMITS[plan] || 999,
        },
        createdAt: new Date(),
        lastActiveAt: new Date(),
      }

      matrix[marketingFeature][plan] = hasMarketingFeature(mockUser, marketingFeature)
    }
  }

  return matrix
}

/**
 * Get feature description for tooltips/help text
 *
 * @param marketingFeature - Marketing feature name
 * @returns Description string or undefined if not found
 *
 * @example
 * getFeatureDescription('enhanced-ai-coaching')
 * // "Advanced AI-powered coaching with personalized meal plans and health guidance."
 */
export function getFeatureDescription(marketingFeature: string): string | undefined {
  return MARKETING_FEATURE_DESCRIPTIONS[marketingFeature]
}

/**
 * Validate that all technical features are mapped to at least one marketing feature
 * Used for testing and documentation purposes
 *
 * @returns Object with validation results
 */
export function validateFeatureMapping(): {
  valid: boolean
  unmappedTechnicalFeatures: string[]
  emptyMarketingFeatures: string[]
} {
  const unmappedTechnicalFeatures: string[] = []
  const emptyMarketingFeatures: string[] = []

  // Check for marketing features with no technical features
  for (const [marketingFeature, technicalFeatures] of Object.entries(
    MARKETING_TO_TECHNICAL_FEATURES
  )) {
    if (!technicalFeatures || technicalFeatures.length === 0) {
      emptyMarketingFeatures.push(marketingFeature)
    }
  }

  return {
    valid: unmappedTechnicalFeatures.length === 0 && emptyMarketingFeatures.length === 0,
    unmappedTechnicalFeatures,
    emptyMarketingFeatures,
  }
}
