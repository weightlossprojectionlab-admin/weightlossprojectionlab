'use client'

import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/auth'
import { userProfileOperations } from '@/lib/firebase-operations'
import { DEFAULT_GOALS, createDefaultProfile } from '@/lib/default-profile'
import { logger } from '@/lib/logger'
import { db } from '@/lib/firebase'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'

export interface UserProfileData {
  goals?: any
  preferences?: any
  profile?: any
  subscription?: any
  [key: string]: any
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Try to fetch existing profile
      const response = await userProfileOperations.getUserProfile()
      setProfile(response.data)
    } catch (profileError: any) {
      // If profile doesn't exist (404), redirect to onboarding. Auth
      // session exists (we got a token to hit the API) but Firestore
      // has no user record — that's the "deleted user resurrects" or
      // "post-signup pre-onboarding" state. Previously this branch
      // silently auto-created a default Single trial via POST, which
      // bypassed onboarding entirely. The redirect routes the user
      // through the proper flow.
      //
      // window.location guarantees a full nav (the hook can't use
      // useRouter from this file's import context, and a hard nav
      // also clears any stale client state from before the delete).
      // Don't redirect if we're already on /onboarding (defensive —
      // /onboarding doesn't mount this hook today, but guards against
      // a future regression).
      if (profileError.message?.includes('404') || profileError.message?.includes('not found')) {
        logger.warn('User profile not found — redirecting to /onboarding')

        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/onboarding')) {
          window.location.href = '/onboarding'
          return
        }

        // Fallback if we ARE on /onboarding somehow — leave profile
        // null and set error so the page can render without a profile.
        setError(profileError)
      } else {
        // Other error - set error state
        setError(profileError)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Set up real-time listener for subscription changes
  useEffect(() => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      setLoading(false)
      return
    }

    logger.debug('[useUserProfile] Setting up subscription check', { userId: currentUser.uid })

    const userDocRef = doc(db, 'users', currentUser.uid)

    // CRITICAL FIX: Synchronous fetch first to prevent race condition
    const initializeProfile = async () => {
      try {
        const docSnap = await getDoc(userDocRef)
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfileData
          logger.debug('[useUserProfile] Initial sync fetch complete', {
            subscriptionStatus: data.subscription?.status
          })
          setProfile(data)
          setLoading(false)
        } else {
          // Document doesn't exist, try to create it
          logger.warn('[useUserProfile] User document does not exist, creating...')
          fetchProfile()
        }
      } catch (error) {
        logger.error('[useUserProfile] Error fetching profile:', error instanceof Error ? error : new Error(String(error)))
        setError(error as Error)
        setLoading(false)
      }
    }

    initializeProfile()

    // THEN set up real-time listener for updates
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as UserProfileData
          logger.debug('[useUserProfile] Real-time update received', {
            subscriptionStatus: data.subscription?.status
          })
          setProfile(data)
        }
      },
      (error) => {
        logger.error('[useUserProfile] Real-time listener error:', error)
        setError(error)
      }
    )

    // Clean up listener on unmount
    return () => {
      logger.debug('[useUserProfile] Cleaning up real-time listener')
      unsubscribe()
    }
  }, [fetchProfile])

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile
  }
}
