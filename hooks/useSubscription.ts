/**
 * useSubscription Hook
 *
 * Provides access to the user's subscription with admin override and dev simulation support
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { UserSubscription } from '@/types'
import { getUserSubscription, isAdmin } from '@/lib/feature-gates'

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdminUser, setIsAdminUser] = useState(false)

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      setIsAdminUser(false)
      return
    }

    // Get effective subscription (with admin override and dev simulation)
    const effectiveSubscription = getUserSubscription(user)
    setSubscription(effectiveSubscription)
    setIsAdminUser(isAdmin(user))
    setLoading(false)

    // Listen for simulation changes (works in dev mode and for admin users)
    const handleSimulationChange = () => {
      console.log('[useSubscription] Received subscription-simulation-changed event')
      const updated = getUserSubscription(user)
      console.log('[useSubscription] Updated subscription:', updated)
      setSubscription(updated)
    }

    console.log('[useSubscription] Adding event listener for subscription-simulation-changed')
    window.addEventListener('subscription-simulation-changed', handleSimulationChange)
    return () => {
      console.log('[useSubscription] Removing event listener for subscription-simulation-changed')
      window.removeEventListener('subscription-simulation-changed', handleSimulationChange)
    }
  }, [user])

  return {
    subscription,
    loading,
    isAdmin: isAdminUser,
    hasSubscription: subscription !== null,
    plan: subscription?.plan || null,
    status: subscription?.status || null,
    addons: subscription?.addons || { familyFeatures: false }
  }
}
