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

import { logger } from '@/lib/logger'
import { User } from 'firebase/auth'
import { userProfileOperations } from './firebase-operations'
import { medicalOperations } from './medical-operations'

export type UserDestination =
  | { type: 'auth', reason?: string }
  | { type: 'onboarding', resumeStep?: number, reason?: string }
  | { type: 'dashboard', reason?: string }
  | { type: 'patients', reason?: string }
  | { type: 'caregiver', accountOwnerId: string, reason?: string } // Caregiver-only view
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
  logger.debug('[AuthRouter] Determining user destination', {
    userId: user?.uid,
    currentPath,
    email: user?.email
  })

  // Allow admin pages to handle their own authentication
  if (currentPath.startsWith('/admin')) {
    logger.debug('[AuthRouter] Admin page detected - letting admin layout handle auth')
    return { type: 'stay', reason: 'Admin page - handled by admin layout' }
  }

  // Step 1: Not authenticated → Must go to /auth
  if (!user) {
    logger.debug('[AuthRouter] No user - redirect to /auth')
    return { type: 'auth', reason: 'Not authenticated' }
  }

  // Step 2: User authenticated → Check profile status
  try {
    logger.debug('[AuthRouter] Fetching user profile', { userId: user.uid })
    const profileResponse = await userProfileOperations.getUserProfile()
    const profile = profileResponse?.data

    // Step 3: Profile doesn't exist → Create it and start onboarding
    if (!profile) {
      logger.info('[AuthRouter] No profile found - creating profile and starting onboarding', { userId: user.uid })
      await createProfileForUser(user)
      return {
        type: 'onboarding',
        resumeStep: 1,
        reason: 'Profile created - starting onboarding'
      }
    }

    logger.debug('[AuthRouter] Profile found', {
      onboardingCompleted: profile.profile?.onboardingCompleted,
      currentStep: profile.profile?.currentOnboardingStep,
      caregiverOf: profile.caregiverOf?.length || 0
    })

    // DEBUG: Log entire profile structure to diagnose onboarding redirect
    console.log('[AuthRouter DEBUG] Full profile:', JSON.stringify(profile, null, 2))
    console.log('[AuthRouter DEBUG] profile.profile:', profile.profile)
    console.log('[AuthRouter DEBUG] onboardingCompleted value:', profile.profile?.onboardingCompleted)
    console.log('[AuthRouter DEBUG] typeof onboardingCompleted:', typeof profile.profile?.onboardingCompleted)
    console.log('[AuthRouter DEBUG] caregiverOf:', profile.caregiverOf)

    // Step 3.5: Check if user is ONLY a caregiver (no personal account)
    const isCaregiverOnly = !profile.profile?.onboardingCompleted && profile.caregiverOf && profile.caregiverOf.length > 0

    if (isCaregiverOnly) {
      // User is a caregiver but has not created their own account
      logger.debug('[AuthRouter] Caregiver-only user detected', {
        caregiverAccounts: profile.caregiverOf.length
      })

      // Get the first caregiver context (they might have multiple)
      const firstCaregiverContext = profile.caregiverOf[0]

      // If on /auth or /onboarding, redirect to caregiver dashboard
      if (currentPath === '/auth' || currentPath === '/onboarding') {
        return {
          type: 'caregiver',
          accountOwnerId: firstCaregiverContext.accountOwnerId,
          reason: 'Caregiver-only user - redirect to caregiver dashboard'
        }
      }

      // If already on caregiver page, let them stay
      if (currentPath.startsWith('/caregiver/')) {
        return { type: 'stay', reason: 'Viewing caregiver dashboard' }
      }

      // Otherwise redirect to first caregiver account
      return {
        type: 'caregiver',
        accountOwnerId: firstCaregiverContext.accountOwnerId,
        reason: 'Caregiver-only user accessing non-caregiver page'
      }
    }

    // Step 4: Check onboarding completion status
    const isOnboardingCompleted = profile.profile?.onboardingCompleted === true

    if (isOnboardingCompleted) {
      // Fully onboarded → Check if family plan user or single user
      logger.debug('[AuthRouter] Onboarding completed - determining entry point')

      // Check if user has family members (family plan)
      let hasFamilyPlan = false
      try {
        const patients = await medicalOperations.patients.getPatients()
        hasFamilyPlan = patients && patients.length >= 2
        logger.debug('[AuthRouter] Family plan check', { patientCount: patients?.length, hasFamilyPlan })
      } catch (error) {
        logger.debug('[AuthRouter] Could not check family members, defaulting to dashboard', { error })
      }

      // If user is on /onboarding but already completed, redirect based on plan type
      if (currentPath === '/onboarding') {
        if (hasFamilyPlan) {
          return { type: 'patients', reason: 'Family plan - redirect to patients page' }
        }
        return { type: 'dashboard', reason: 'Single user - redirect to dashboard' }
      }

      // If on /auth but already logged in and onboarded, redirect based on plan type
      if (currentPath === '/auth') {
        if (hasFamilyPlan) {
          return { type: 'patients', reason: 'Family plan - redirect to patients page' }
        }
        return { type: 'dashboard', reason: 'Single user - redirect to dashboard' }
      }

      // If accessing /dashboard with family plan (2+ members), redirect to /patients
      if (currentPath === '/dashboard' && hasFamilyPlan) {
        return { type: 'patients', reason: 'Family plan users should use patients page as hub' }
      }

      // Otherwise they can stay where they are
      return { type: 'stay', reason: 'User has full access' }
    }

    // Step 5: Onboarding incomplete → Must complete onboarding
    const resumeStep = profile.profile?.currentOnboardingStep || 1
    logger.debug('[AuthRouter] Onboarding incomplete - resume from step', { resumeStep })

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
    logger.error('[AuthRouter] Error determining user destination', error as Error)

    // Check if error is due to authentication issues (401, 403, etc.)
    const isAuthError = error.status === 401 ||
                        error.status === 403 ||
                        error.message?.includes('401') ||
                        error.message?.includes('403') ||
                        error.message?.includes('Unauthorized') ||
                        error.message?.includes('unauthenticated')

    if (isAuthError) {
      logger.warn('[AuthRouter] Authentication error - redirect to /auth', { error: error.message })
      return {
        type: 'auth',
        reason: 'Authentication required'
      }
    }

    // Profile fetch failed (404 or other error) → Create profile and start onboarding
    if (error.message?.includes('404') ||
        error.message?.includes('not found') ||
        error.message?.includes('User profile not found')) {
      logger.info('[AuthRouter] Profile not found (404) - creating and starting onboarding')
      try {
        await createProfileForUser(user)
        return {
          type: 'onboarding',
          resumeStep: 1,
          reason: 'Profile created after 404 error'
        }
      } catch (createError) {
        logger.error('[AuthRouter] Failed to create profile', createError as Error)
        // Even if profile creation fails, send to onboarding
        // (onboarding page will try to create it again)
        return {
          type: 'onboarding',
          resumeStep: 1,
          reason: 'Error creating profile - will retry in onboarding'
        }
      }
    }

    // Server error (500) → Likely a temporary API issue, allow dashboard access
    if (error.status === 500 || error.message?.includes('500')) {
      logger.error('[AuthRouter] Server error (500) - allowing access to dashboard', error instanceof Error ? error : undefined)
      return {
        type: 'dashboard',
        reason: 'Server error - temporarily allowing access'
      }
    }

    // Other error (network, etc.) → Assume needs onboarding to be safe
    logger.warn('[AuthRouter] Unknown error - defaulting to onboarding', { error: error.message })
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
  logger.debug('[AuthRouter] Creating profile for user', { userId: user.uid })

  const profileData = {
    email: user.email || '',
    name: user.displayName || user.email?.split('@')[0] || 'User',
  }

  try {
    await userProfileOperations.createUserProfile(profileData)
    logger.info('[AuthRouter] Profile created successfully', { userId: user.uid })
  } catch (error: any) {
    // Profile might already exist (409 conflict) - that's OK
    if (error.message?.includes('409') ||
        error.message?.includes('already exists') ||
        error.message?.includes('User profile already exists')) {
      logger.debug('[AuthRouter] Profile already exists (409) - continuing', { userId: user.uid })
      return
    }

    // Other error - re-throw
    logger.error('[AuthRouter] Failed to create profile', error as Error, { userId: user.uid })
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
