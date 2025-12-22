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
import { getUserSubscription, isAdmin } from '@/lib/feature-gates'
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
      setLoading(false)
      setIsAdminUser(false)
      return
    }

    // Get effective subscription (with admin override and dev simulation)
    const effectiveSubscription = getUserSubscription(user as any)
    setSubscription(effectiveSubscription)
    setIsAdminUser(isAdmin(user as any))
    setLoading(false)

    // Real-time listener for subscription changes from Firestore
    // This catches webhook updates from Stripe
    console.log('[useSubscription] Setting up real-time Firestore listener for user:', user.uid)
    const userDocRef = doc(db, 'users', user.uid)
    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data()
        const updatedSubscription = userData?.subscription as UserSubscription | undefined
        console.log('[useSubscription] Firestore subscription updated:', updatedSubscription)
        if (updatedSubscription) {
          setSubscription(updatedSubscription)
        }
      }
    }, (error) => {
      console.error('[useSubscription] Firestore listener error:', error)
    })

    // Listen for simulation changes (works in dev mode and for admin users)
    const handleSimulationChange = () => {
      console.log('[useSubscription] Received subscription-simulation-changed event')
      const updated = getUserSubscription(user as any)
      console.log('[useSubscription] Updated subscription:', updated)
      setSubscription(updated)
    }

    console.log('[useSubscription] Adding event listener for subscription-simulation-changed')
    window.addEventListener('subscription-simulation-changed', handleSimulationChange)

    return () => {
      console.log('[useSubscription] Cleaning up Firestore listener')
      unsubscribeFirestore()
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
