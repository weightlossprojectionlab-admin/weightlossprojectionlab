/**
 * useFeatureGate Hook
 *
 * Provides feature gating functionality with subscription-based access control
 * and upgrade prompts for locked features
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { useSubscription } from './useSubscription'
import { canAccessFeature, getRequiredUpgrade } from '@/lib/feature-gates'
import { SubscriptionPlan } from '@/types'

export interface FeatureGateResult {
  /** Whether the user can access this feature */
  canAccess: boolean

  /** Legacy alias for canAccess */
  hasFeature: boolean

  /** Whether the user is currently loading */
  loading: boolean

  /** What type of upgrade is required (if any) */
  requiresUpgrade: {
    type: 'plan' | 'addon' | 'none'
    plan?: 'single' | 'family'
    addon?: string
  }

  /** Legacy alias for requiresUpgrade */
  requiredUpgrade: {
    type: 'plan' | 'addon' | 'none'
    plan?: 'single' | 'family'
    addon?: string
  }

  /** The user's current plan */
  currentPlan: SubscriptionPlan | null

  /** Suggested plan to upgrade to for this feature */
  suggestedPlan?: SubscriptionPlan
}

/**
 * Check if user can access a feature and get upgrade info
 *
 * @param feature - Feature identifier (e.g., 'multiple-patients', 'appointments')
 * @returns FeatureGateResult with access status and upgrade requirements
 *
 * @example
 * ```tsx
 * const { canAccess, requiresUpgrade, suggestedPlan } = useFeatureGate('appointments')
 *
 * if (!canAccess) {
 *   return <UpgradePrompt feature="appointments" suggestedPlan={suggestedPlan} />
 * }
 * ```
 */
export function useFeatureGate(feature: string): FeatureGateResult {
  const { user } = useAuth()
  const { subscription, loading: subLoading, plan } = useSubscription()
  const [hasFeature, setHasFeature] = useState(false)
  const [loading, setLoading] = useState(true)
  const [requiredUpgrade, setRequiredUpgrade] = useState<{
    type: 'plan' | 'addon' | 'none'
    plan?: 'single' | 'family'
    addon?: string
  }>({ type: 'none' })
  const [suggestedPlan, setSuggestedPlan] = useState<SubscriptionPlan | undefined>()

  useEffect(() => {
    if (!user) {
      setHasFeature(false)
      setLoading(false)
      setRequiredUpgrade({ type: 'none' })
      setSuggestedPlan(undefined)
      return
    }

    const hasAccess = canAccessFeature(user as any, feature)
    setHasFeature(hasAccess)
    setLoading(subLoading)

    if (!hasAccess) {
      const upgrade = getRequiredUpgrade(feature)
      setRequiredUpgrade(upgrade)

      // Determine suggested plan
      if (upgrade.type === 'plan') {
        if (upgrade.plan === 'single') {
          setSuggestedPlan('single')
        } else if (upgrade.plan === 'family') {
          // Default to Family Plus (most popular)
          setSuggestedPlan('family_plus')
        }
      }
    } else {
      setRequiredUpgrade({ type: 'none' })
      setSuggestedPlan(undefined)
    }

    // Listen for simulation changes in dev mode
    if (process.env.NODE_ENV === 'development') {
      const handleSimulationChange = () => {
        const updated = canAccessFeature(user as any, feature)
        setHasFeature(updated)

        if (!updated) {
          const upgrade = getRequiredUpgrade(feature)
          setRequiredUpgrade(upgrade)

          if (upgrade.type === 'plan') {
            setSuggestedPlan(upgrade.plan === 'single' ? 'single' : 'family_plus')
          }
        } else {
          setRequiredUpgrade({ type: 'none' })
          setSuggestedPlan(undefined)
        }
      }

      window.addEventListener('subscription-simulation-changed', handleSimulationChange)
      return () => {
        window.removeEventListener('subscription-simulation-changed', handleSimulationChange)
      }
    }
  }, [user, feature, subLoading])

  return {
    canAccess: hasFeature,
    hasFeature, // Legacy alias
    loading,
    requiresUpgrade: requiredUpgrade,
    requiredUpgrade, // Legacy alias
    currentPlan: plan,
    suggestedPlan
  }
}

/**
 * Check multiple features at once
 *
 * @param features - Array of feature identifiers
 * @returns Object mapping feature names to their access status
 *
 * @example
 * ```tsx
 * const access = useFeatureGates(['appointments', 'medications', 'advanced-analytics'])
 *
 * if (access['advanced-analytics'].canAccess) {
 *   // Show advanced analytics
 * }
 * ```
 */
export function useFeatureGates(features: string[]): Record<string, FeatureGateResult> {
  const { user } = useAuth()
  const { subscription, loading: subLoading, plan } = useSubscription()
  const [results, setResults] = useState<Record<string, FeatureGateResult>>({})

  useEffect(() => {
    if (!user) {
      const emptyResults: Record<string, FeatureGateResult> = {}
      features.forEach(feature => {
        emptyResults[feature] = {
          canAccess: false,
          hasFeature: false,
          loading: false,
          requiresUpgrade: { type: 'none' },
          requiredUpgrade: { type: 'none' },
          currentPlan: null,
          suggestedPlan: undefined
        }
      })
      setResults(emptyResults)
      return
    }

    const newResults: Record<string, FeatureGateResult> = {}

    features.forEach(feature => {
      const canAccess = canAccessFeature(user as any, feature)
      const requiresUpgrade = getRequiredUpgrade(feature)

      let suggestedPlan: SubscriptionPlan | undefined
      if (!canAccess && requiresUpgrade.type !== 'none') {
        if (requiresUpgrade.type === 'plan') {
          suggestedPlan = requiresUpgrade.plan === 'single' ? 'single' : 'family_plus'
        }
      }

      newResults[feature] = {
        canAccess,
        hasFeature: canAccess,
        loading: subLoading,
        requiresUpgrade,
        requiredUpgrade: requiresUpgrade,
        currentPlan: plan,
        suggestedPlan
      }
    })

    setResults(newResults)
  }, [user, features, subLoading, plan])

  return results
}
