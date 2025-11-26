/**
 * useFeatureGate Hook
 *
 * Check if user has access to a specific feature based on their subscription
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { canAccessFeature, getRequiredUpgrade } from '@/lib/feature-gates'

export function useFeatureGate(feature: string) {
  const { user } = useAuth()
  const [hasFeature, setHasFeature] = useState(false)
  const [loading, setLoading] = useState(true)
  const [requiredUpgrade, setRequiredUpgrade] = useState<{
    type: 'plan' | 'addon' | 'none'
    plan?: 'single' | 'family'
    addon?: string
  }>({ type: 'none' })

  useEffect(() => {
    if (!user) {
      setHasFeature(false)
      setLoading(false)
      setRequiredUpgrade({ type: 'none' })
      return
    }

    const hasAccess = canAccessFeature(user, feature)
    setHasFeature(hasAccess)
    setLoading(false)

    if (!hasAccess) {
      const upgrade = getRequiredUpgrade(feature)
      setRequiredUpgrade(upgrade)
    }

    // Listen for simulation changes in dev mode
    if (process.env.NODE_ENV === 'development') {
      const handleSimulationChange = () => {
        const updated = canAccessFeature(user, feature)
        setHasFeature(updated)

        if (!updated) {
          const upgrade = getRequiredUpgrade(feature)
          setRequiredUpgrade(upgrade)
        }
      }

      window.addEventListener('subscription-simulation-changed', handleSimulationChange)
      return () => {
        window.removeEventListener('subscription-simulation-changed', handleSimulationChange)
      }
    }
  }, [user, feature])

  return {
    hasFeature,
    loading,
    requiredUpgrade
  }
}
