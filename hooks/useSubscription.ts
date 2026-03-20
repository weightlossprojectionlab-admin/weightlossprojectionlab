/**
 * useSubscription Hook
 *
 * Provides access to the user's subscription with admin override and dev simulation support
 * Includes real-time Firestore listener for webhook updates
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { UserSubscription } from '@/types'
import { getUserSubscription, isAdmin, setCachedSubscription } from '@/lib/feature-gates'
import { db } from '@/lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdminUser, setIsAdminUser] = useState(false)

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      setCachedSubscription(null)
      setLoading(false)
      setIsAdminUser(false)
      return
    }

    // Get effective subscription (with admin override and dev simulation)
    const effectiveSubscription = getUserSubscription(user as any)
    setSubscription(effectiveSubscription)
    setCachedSubscription(effectiveSubscription)
    setIsAdminUser(isAdmin(user as any))
    setLoading(false)

    // Real-time listener for subscription changes from Firestore
    // This catches webhook updates from Stripe
    // Real-time Firestore listener for subscription updates
    const userDocRef = doc(db, 'users', user.uid)
    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data()
        const updatedSubscription = userData?.subscription as UserSubscription | undefined
        // Subscription updated from Firestore
        if (updatedSubscription) {
          // Convert Firestore Timestamps to Date objects for proper rendering
          const converted = {
            ...updatedSubscription,
            trialEndsAt: updatedSubscription.trialEndsAt && typeof updatedSubscription.trialEndsAt === 'object' && 'toDate' in updatedSubscription.trialEndsAt
              ? (updatedSubscription.trialEndsAt as any).toDate()
              : updatedSubscription.trialEndsAt,
            currentPeriodEnd: updatedSubscription.currentPeriodEnd && typeof updatedSubscription.currentPeriodEnd === 'object' && 'toDate' in updatedSubscription.currentPeriodEnd
              ? (updatedSubscription.currentPeriodEnd as any).toDate()
              : updatedSubscription.currentPeriodEnd,
            currentPeriodStart: updatedSubscription.currentPeriodStart && typeof updatedSubscription.currentPeriodStart === 'object' && 'toDate' in updatedSubscription.currentPeriodStart
              ? (updatedSubscription.currentPeriodStart as any).toDate()
              : updatedSubscription.currentPeriodStart,
          }
          setSubscription(converted)
          setCachedSubscription(converted)
        }
      }
    }, (error) => {
      console.error('[useSubscription] Firestore listener error:', error)
    })

    // Listen for simulation changes (works in dev mode and for admin users)
    const handleSimulationChange = () => {
      // Simulation changed
      const updated = getUserSubscription(user as any)
      // Updated from simulation
      setSubscription(updated)
      setCachedSubscription(updated)
    }

    // Listen for dev simulation changes
    window.addEventListener('subscription-simulation-changed', handleSimulationChange)

    return () => {
      // Cleanup
      unsubscribeFirestore()
      // Remove simulation listener
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
