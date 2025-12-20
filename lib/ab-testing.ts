/**
 * A/B Testing Framework
 *
 * Manages feature flags, experiment assignments, and variant tracking
 * for conversion optimization and user experience testing.
 */

import { User } from '@/types'

export type ExperimentVariant = 'control' | 'test'

export interface Experiment {
  id: string
  name: string
  description: string
  enabled: boolean
  trafficAllocation: number // Percentage of users in test variant (0-100)
  startDate: Date
  endDate?: Date
}

export interface ExperimentAssignment {
  experimentId: string
  variant: ExperimentVariant
  assignedAt: Date
}

// Active experiments configuration
const EXPERIMENTS: Record<string, Experiment> = {
  'onboarding-upgrade-prompt': {
    id: 'onboarding-upgrade-prompt',
    name: 'Onboarding Upgrade Prompt',
    description: 'Test showing upgrade prompt when users select premium features during onboarding',
    enabled: true,
    trafficAllocation: 20, // 20% of users see upgrade prompt
    startDate: new Date('2025-12-18'),
    endDate: undefined,
  },
}

/**
 * Get experiment configuration
 */
export function getExperiment(experimentId: string): Experiment | null {
  return EXPERIMENTS[experimentId] || null
}

/**
 * Check if user is in experiment's test variant
 * Uses deterministic hashing to ensure consistent assignment
 */
export function isInTestVariant(
  experimentId: string,
  userId: string
): boolean {
  const experiment = getExperiment(experimentId)

  if (!experiment || !experiment.enabled) {
    return false // Experiment disabled or not found
  }

  // Check if experiment is active (between start and end dates)
  const now = new Date()
  if (now < experiment.startDate) {
    return false // Experiment hasn't started
  }
  if (experiment.endDate && now > experiment.endDate) {
    return false // Experiment has ended
  }

  // Deterministic assignment based on user ID
  const hash = simpleHash(userId + experimentId)
  const bucket = hash % 100 // 0-99

  // User is in test variant if bucket < trafficAllocation
  return bucket < experiment.trafficAllocation
}

/**
 * Get variant assignment for user
 */
export function getVariant(
  experimentId: string,
  userId: string
): ExperimentVariant {
  return isInTestVariant(experimentId, userId) ? 'test' : 'control'
}

/**
 * Simple hash function for consistent bucketing
 * Uses string character codes to generate deterministic hash
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Log experiment impression (user saw the experiment)
 * In production, this would send to analytics service
 */
export function logExperimentImpression(
  experimentId: string,
  variant: ExperimentVariant,
  userId: string,
  metadata?: Record<string, any>
): void {
  if (typeof window === 'undefined') return // Server-side, skip

  console.log('[A/B Test] Impression:', {
    experimentId,
    variant,
    userId,
    timestamp: new Date().toISOString(),
    ...metadata,
  })

  // In production, send to analytics:
  // analytics.track('Experiment Impression', { experimentId, variant, userId, ...metadata })
}

/**
 * Log experiment conversion (user completed desired action)
 */
export function logExperimentConversion(
  experimentId: string,
  variant: ExperimentVariant,
  userId: string,
  conversionType: string,
  metadata?: Record<string, any>
): void {
  if (typeof window === 'undefined') return // Server-side, skip

  console.log('[A/B Test] Conversion:', {
    experimentId,
    variant,
    userId,
    conversionType,
    timestamp: new Date().toISOString(),
    ...metadata,
  })

  // In production, send to analytics:
  // analytics.track('Experiment Conversion', { experimentId, variant, userId, conversionType, ...metadata })
}

/**
 * Save experiment assignment to local storage for consistency
 */
export function saveExperimentAssignment(
  experimentId: string,
  variant: ExperimentVariant,
  userId: string
): void {
  if (typeof window === 'undefined') return

  try {
    const assignment: ExperimentAssignment = {
      experimentId,
      variant,
      assignedAt: new Date(),
    }

    const key = `experiment_${experimentId}_${userId}`
    localStorage.setItem(key, JSON.stringify(assignment))
  } catch (error) {
    console.error('Error saving experiment assignment:', error)
  }
}

/**
 * Get saved experiment assignment from local storage
 */
export function getSavedExperimentAssignment(
  experimentId: string,
  userId: string
): ExperimentAssignment | null {
  if (typeof window === 'undefined') return null

  try {
    const key = `experiment_${experimentId}_${userId}`
    const saved = localStorage.getItem(key)

    if (saved) {
      return JSON.parse(saved) as ExperimentAssignment
    }
  } catch (error) {
    console.error('Error getting saved experiment assignment:', error)
  }

  return null
}

/**
 * Get or assign variant for user (with caching)
 */
export function getOrAssignVariant(
  experimentId: string,
  userId: string
): ExperimentVariant {
  // Check if user already has an assignment
  const saved = getSavedExperimentAssignment(experimentId, userId)
  if (saved) {
    return saved.variant
  }

  // Assign new variant
  const variant = getVariant(experimentId, userId)
  saveExperimentAssignment(experimentId, variant, userId)

  return variant
}

/**
 * Hook-friendly wrapper for experiment variant
 * Use this in React components
 */
export function useExperiment(
  experimentId: string,
  user: User | null
): {
  variant: ExperimentVariant
  isTest: boolean
  isControl: boolean
  logImpression: (metadata?: Record<string, any>) => void
  logConversion: (conversionType: string, metadata?: Record<string, any>) => void
} {
  if (!user) {
    return {
      variant: 'control',
      isTest: false,
      isControl: true,
      logImpression: () => {},
      logConversion: () => {},
    }
  }

  const variant = getOrAssignVariant(experimentId, (user as any).uid)

  return {
    variant,
    isTest: variant === 'test',
    isControl: variant === 'control',
    logImpression: (metadata) => {
      logExperimentImpression(experimentId, variant, (user as any).uid, metadata)
    },
    logConversion: (conversionType, metadata) => {
      logExperimentConversion(experimentId, variant, (user as any).uid, conversionType, metadata)
    },
  }
}

/**
 * Get all active experiments
 */
export function getActiveExperiments(): Experiment[] {
  const now = new Date()

  return Object.values(EXPERIMENTS).filter(exp => {
    if (!exp.enabled) return false
    if (now < exp.startDate) return false
    if (exp.endDate && now > exp.endDate) return false
    return true
  })
}

/**
 * Get experiment statistics (for admin dashboard)
 * In production, this would query analytics backend
 */
export interface ExperimentStats {
  experimentId: string
  variant: ExperimentVariant
  impressions: number
  conversions: number
  conversionRate: number
}

export function getExperimentStats(
  experimentId: string
): ExperimentStats[] {
  // Mock data - in production, fetch from analytics
  return [
    {
      experimentId,
      variant: 'control',
      impressions: 1000,
      conversions: 120,
      conversionRate: 12.0,
    },
    {
      experimentId,
      variant: 'test',
      impressions: 200,
      conversions: 30,
      conversionRate: 15.0,
    },
  ]
}

/**
 * Clear all experiment assignments (for testing)
 */
export function clearAllExperiments(): void {
  if (typeof window === 'undefined') return

  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('experiment_')) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error('Error clearing experiments:', error)
  }
}
