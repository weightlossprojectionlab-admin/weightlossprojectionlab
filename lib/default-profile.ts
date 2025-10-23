/**
 * Default user preferences for new accounts
 * Matches the structure used in /api/user-profile
 */
export const DEFAULT_PREFERENCES = {
  units: 'imperial' as const,
  notifications: {
    dailyReminders: true,
    weeklyReports: true,
    achievements: true,
  },
  privacy: {
    dataSharing: false,
    analytics: true,
  },
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
 * Uses nested structure to match Firestore schema
 */
export const createDefaultProfile = (email: string, name: string) => {
  return {
    email,
    name,
    profile: {
      onboardingCompleted: false, // New users need to complete onboarding
    },
    preferences: DEFAULT_PREFERENCES,
    goals: {},
    createdAt: new Date(),
    lastActiveAt: new Date(),
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
