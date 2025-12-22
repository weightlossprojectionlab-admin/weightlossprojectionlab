/**
 * useUser Hook
 *
 * Centralized hook that combines Firebase Auth user with Firestore subscription data
 * This ensures all feature gating and subscription checks have access to complete user data
 *
 * USE THIS INSTEAD OF useAuth() when you need subscription data
 */

'use client'

import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { useSubscription } from './useSubscription'
import { User } from '@/types'

export interface UserWithSubscription extends User {
  // Subscription is already typed in User, but we ensure it's always present
}

/**
 * Get the current user with merged subscription data
 *
 * @returns Object with user (includes subscription), loading state, and subscription helpers
 *
 * @example
 * ```tsx
 * const { user, loading, subscription, isAdmin } = useUser()
 *
 * if (loading) return <Spinner />
 * if (!user) return <LoginPrompt />
 *
 * // user.subscription is now available and up-to-date
 * const canAccess = canAccessFeature(user, 'appointments')
 * ```
 */
export function useUser() {
  const { user: authUser, loading: authLoading } = useAuth()
  const { subscription, loading: subscriptionLoading, isAdmin } = useSubscription()

  // Merge subscription into user object - memoized to prevent infinite loops
  const user = useMemo(() => {
    if (!authUser) return null

    return {
      ...authUser,
      subscription
    } as unknown as UserWithSubscription
  }, [authUser, subscription])

  // Still loading if either auth or subscription is loading
  const loading = authLoading || subscriptionLoading

  return {
    user,
    loading,
    subscription,
    isAdmin,
    // Convenience helpers
    hasSubscription: subscription !== null,
    plan: subscription?.plan || null,
    status: subscription?.status || null,
  }
}
