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
      // If profile doesn't exist (404), auto-create it
      if (profileError.message?.includes('404') || profileError.message?.includes('not found')) {
        logger.warn('User profile not found, auto-creating:', profileError)

        const currentUser = auth.currentUser
        if (currentUser) {
          try {
            // Create profile with user's info
            const profileData = createDefaultProfile(
              currentUser.email || '',
              currentUser.displayName || currentUser.email?.split('@')[0] || 'User'
            )

            // Save to Firestore
            const createdProfile = await userProfileOperations.createUserProfile(profileData)
            setProfile(createdProfile.data)
            logger.debug('✅ Auto-created user profile successfully')
          } catch (createError: any) {
            logger.error('Error auto-creating profile:', createError)

            // Use defaults as fallback
            setProfile({
              goals: DEFAULT_GOALS,
              preferences: {
                units: { weight: 'lbs', height: 'in' },
                notifications: { dailyReminders: true, weeklyReports: true, achievements: true },
                privacy: { dataSharing: false, analytics: true }
              }
            })
          }
        } else {
          // No current user - use defaults
          setProfile({
            goals: DEFAULT_GOALS,
            preferences: {
              units: { weight: 'lbs', height: 'in' },
              notifications: { dailyReminders: true, weeklyReports: true, achievements: true },
              privacy: { dataSharing: false, analytics: true }
            }
          })
        }
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
        logger.error('[useUserProfile] Error fetching profile:', error)
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
