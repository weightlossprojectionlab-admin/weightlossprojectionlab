'use client'

import { useMemo } from 'react'
import { calculateWeightProjection, type WeightProjection } from '@/lib/weight-projection-agent'
import type { WeightLog, UserProfile, UserGoals } from '@/types'
import type { UserProfileData } from './useUserProfile'

/**
 * React hook wrapper for Weight Projection Agent
 *
 * Uses historical weight logs to calculate trend-based projections
 * (complements existing calorie-deficit projections)
 */
export function useTrendProjection(
  weightLogs: WeightLog[],
  userProfile: UserProfileData | null
): WeightProjection | null {
  return useMemo(() => {
    // Need profile and goals
    if (!userProfile?.profile || !userProfile?.goals) {
      return null
    }

    // Need valid weight logs array
    if (!Array.isArray(weightLogs) || weightLogs.length === 0) {
      return null
    }

    // Calculate projection using the agent
    return calculateWeightProjection(
      userProfile.profile as UserProfile,
      userProfile.goals as UserGoals,
      weightLogs
    )
  }, [weightLogs, userProfile])
}
