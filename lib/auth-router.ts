'use client'

/**
 * Centralized Auth & Onboarding Routing Logic
 *
 * Single source of truth for determining where a user should be routed
 * based on their authentication and onboarding status.
 *
 * State Machine:
 * 1. UNAUTHENTICATED → Must be on /auth
 * 2. AUTHENTICATED + NO_PROFILE → Create profile → /onboarding
 * 3. AUTHENTICATED + INCOMPLETE_ONBOARDING → /onboarding (resume)
 * 4. AUTHENTICATED + COMPLETED → /dashboard or any page
 */

import { User } from 'firebase/auth'
import { userProfileOperations } from './firebase-operations'

export type UserDestination =
  | { type: 'auth', reason?: string }
  | { type: 'onboarding', resumeStep?: number, reason?: string }
  | { type: 'dashboard', reason?: string }
  | { type: 'loading' }
  | { type: 'stay', reason?: string } // User can stay where they are

/**
 * Determine where an authenticated user should be routed
 *
 * @param user - Firebase Auth user object (or null if not authenticated)
 * @param currentPath - Current route the user is on
 * @returns Destination object indicating where user should go
 */
export async function determineUserDestination(
  user: User | null,
  currentPath: string
): Promise<UserDestination> {
  console.log('🔀 Determining user destination:', {
    userId: user?.uid,
    currentPath,
    email: user?.email
  })

  // Step 1: Not authenticated → Must go to /auth
  if (!user) {
    console.log('❌ No user - redirect to /auth')
    return { type: 'auth', reason: 'Not authenticated' }
  }

  // Step 2: User authenticated → Check profile status
  try {
    console.log('📡 Fetching user profile for:', user.uid)
    const profileResponse = await userProfileOperations.getUserProfile()
    const profile = profileResponse?.data

    // Step 3: Profile doesn't exist → Create it and start onboarding
    if (!profile) {
      console.log('📝 No profile found - creating profile and starting onboarding')
      await createProfileForUser(user)
      return {
        type: 'onboarding',
        resumeStep: 1,
        reason: 'Profile created - starting onboarding'
      }
    }

    console.log('✅ Profile found:', {
      onboardingCompleted: profile.profile?.onboardingCompleted,
      currentStep: profile.profile?.currentOnboardingStep
    })

    // Step 4: Check onboarding completion status
    const isOnboardingCompleted = profile.profile?.onboardingCompleted === true

    if (isOnboardingCompleted) {
      // Fully onboarded → Allow access to protected pages
      console.log('✅ Onboarding completed - user can access all pages')

      // If user is on /onboarding but already completed, redirect to dashboard
      if (currentPath === '/onboarding') {
        return { type: 'dashboard', reason: 'Already completed onboarding' }
      }

      // If on /auth but already logged in and onboarded, go to dashboard
      if (currentPath === '/auth') {
        return { type: 'dashboard', reason: 'Already authenticated and onboarded' }
      }

      // Otherwise they can stay where they are
      return { type: 'stay', reason: 'User has full access' }
    }

    // Step 5: Onboarding incomplete → Must complete onboarding
    const resumeStep = profile.profile?.currentOnboardingStep || 1
    console.log(`⏸️ Onboarding incomplete - resume from step ${resumeStep}`)

    // If already on /onboarding, let them stay
    if (currentPath === '/onboarding') {
      return { type: 'stay', reason: `Resume onboarding at step ${resumeStep}` }
    }

    // If trying to access other pages, redirect to onboarding
    return {
      type: 'onboarding',
      resumeStep,
      reason: 'Must complete onboarding first'
    }

  } catch (error: any) {
    console.error('❌ Error determining user destination:', error)

    // Profile fetch failed (404 or other error) → Create profile and start onboarding
    if (error.message?.includes('404') ||
        error.message?.includes('not found') ||
        error.message?.includes('User profile not found')) {
      console.log('📝 Profile not found (404) - creating and starting onboarding')
      try {
        await createProfileForUser(user)
        return {
          type: 'onboarding',
          resumeStep: 1,
          reason: 'Profile created after 404 error'
        }
      } catch (createError) {
        console.error('❌ Failed to create profile:', createError)
        // Even if profile creation fails, send to onboarding
        // (onboarding page will try to create it again)
        return {
          type: 'onboarding',
          resumeStep: 1,
          reason: 'Error creating profile - will retry in onboarding'
        }
      }
    }

    // Other error (network, etc.) → Assume needs onboarding to be safe
    console.log('⚠️ Unknown error - defaulting to onboarding')
    return {
      type: 'onboarding',
      resumeStep: 1,
      reason: 'Error loading profile - defaulting to onboarding'
    }
  }
}

/**
 * Create a default user profile in Firestore
 *
 * @param user - Firebase Auth user object
 */
async function createProfileForUser(user: User): Promise<void> {
  console.log('📝 Creating profile for user:', user.uid)

  const profileData = {
    email: user.email || '',
    name: user.displayName || user.email?.split('@')[0] || 'User',
  }

  try {
    await userProfileOperations.createUserProfile(profileData)
    console.log('✅ Profile created successfully')
  } catch (error: any) {
    // Profile might already exist (409 conflict) - that's OK
    if (error.message?.includes('409') ||
        error.message?.includes('already exists') ||
        error.message?.includes('User profile already exists')) {
      console.log('ℹ️ Profile already exists (409) - continuing')
      return
    }

    // Other error - re-throw
    console.error('❌ Failed to create profile:', error)
    throw error
  }
}

/**
 * Helper to check if a profile object indicates completed onboarding
 *
 * @param profile - Profile data from Firebase
 * @returns true if onboarding is completed
 */
export function isOnboardingComplete(profile: any): boolean {
  return profile?.profile?.onboardingCompleted === true
}

/**
 * Helper to check if a user needs to complete onboarding
 *
 * @param profile - Profile data from Firebase
 * @returns true if user needs onboarding
 */
export function needsOnboarding(profile: any): boolean {
  return !isOnboardingComplete(profile)
}
