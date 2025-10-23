/**
 * Default user preferences for new accounts
 * Matches the structure used in /api/user-profile
 */
export const DEFAULT_PREFERENCES = {
  units: 'imperial' as const,
  notifications: true,
  biometricEnabled: false,
}

/**
 * Default user goals for new accounts
 */
export const DEFAULT_GOALS = {
  dailyCalorieGoal: 2000,
  dailySteps: 10000,
  targetWeight: undefined as number | undefined,
  targetWeightUnit: 'lbs' as const,
  startWeight: undefined as number | undefined,
  targetDate: undefined as Date | undefined,
  weeklyWeightLoss: 1, // 1 lb per week default
}

/**
 * Create a default user profile for signup
 * Returns only the fields expected by userProfileOperations.createUserProfile
 */
export const createDefaultProfile = (email: string, name: string) => {
  return {
    email,
    name,
    preferences: DEFAULT_PREFERENCES,
  }
}

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = (profile: any): boolean => {
  return profile?.profile?.onboardingCompleted === true
}

/**
 * Check if profile needs onboarding (missing critical data)
 */
export const needsOnboarding = (profile: any): boolean => {
  // Missing critical data = needs onboarding
  return !profile?.profile?.age ||
         !profile?.profile?.gender ||
         !profile?.profile?.currentWeight ||
         !profile?.goals?.targetWeight ||
         !profile?.goals?.dailyCalorieGoal
}
