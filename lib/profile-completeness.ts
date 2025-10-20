/**
 * Profile Completeness & Safety Checker
 *
 * Validates that users have provided critical safety information
 * (dietary preferences, allergies, health conditions) to prevent
 * dangerous meal suggestions and protect brand reputation.
 */

export interface ProfileCompleteness {
  score: number // 0-100
  isSafe: boolean // true if all critical safety fields filled
  missingCritical: string[]
  missingOptional: string[]
  warnings: string[]
}

export interface UserProfileData {
  preferences?: {
    dietaryPreferences?: string[]
  }
  profile?: {
    foodAllergies?: string[]
    healthConditions?: string[]
    age?: number
    activityLevel?: string
  }
  goals?: {
    primaryGoal?: string
    macroTargets?: {
      protein: number
      carbs: number
      fat: number
    }
  }
}

/**
 * Check if user has provided enough safety information for meal suggestions
 */
export function checkProfileCompleteness(userProfile: UserProfileData | null): ProfileCompleteness {
  const missingCritical: string[] = []
  const missingOptional: string[] = []
  const warnings: string[] = []

  if (!userProfile) {
    return {
      score: 0,
      isSafe: false,
      missingCritical: ['Complete profile'],
      missingOptional: [],
      warnings: ['⚠️ No profile data found. Meal suggestions will not be personalized.']
    }
  }

  // CRITICAL safety fields (at least ONE must be explicitly set)
  const hasDietaryPrefs = Array.isArray(userProfile?.preferences?.dietaryPreferences)
  const hasAllergies = Array.isArray(userProfile?.profile?.foodAllergies)
  const hasHealthConditions = Array.isArray(userProfile?.profile?.healthConditions)

  // User must have EXPLICITLY addressed safety fields (even if empty array = "none")
  const hasAnySafetyInfo = hasDietaryPrefs || hasAllergies || hasHealthConditions

  if (!hasAnySafetyInfo) {
    missingCritical.push('Dietary information not confirmed')
    warnings.push('⚠️ Please confirm if you have any dietary restrictions or allergies')
    warnings.push('Select "None" if you have no restrictions - we just need explicit confirmation')
  }

  // Individual field tracking
  if (!hasDietaryPrefs) {
    missingOptional.push('Dietary preferences (vegan, keto, etc.)')
  }

  if (!hasAllergies) {
    missingOptional.push('Food allergies')
  }

  if (!hasHealthConditions) {
    missingOptional.push('Health conditions')
  }

  // Optional but helpful fields
  if (!userProfile?.profile?.age) {
    missingOptional.push('Age (for age-appropriate portions)')
  }

  if (!userProfile?.profile?.activityLevel) {
    missingOptional.push('Activity level (for calorie sizing)')
  }

  if (!userProfile?.goals?.primaryGoal) {
    missingOptional.push('Primary goal (for macro targeting)')
  }

  // Calculate completeness score
  let score = 0

  // Critical safety fields (70% of score)
  if (hasDietaryPrefs) score += 25
  if (hasAllergies) score += 25
  if (hasHealthConditions) score += 20

  // Optional helpful fields (30% of score)
  if (userProfile?.profile?.age) score += 10
  if (userProfile?.profile?.activityLevel) score += 10
  if (userProfile?.goals?.primaryGoal) score += 10

  // Safety determination
  const isSafe = hasAnySafetyInfo

  return {
    score,
    isSafe,
    missingCritical,
    missingOptional,
    warnings
  }
}

/**
 * Get user-friendly description of what's missing
 */
export function getMissingFieldsDescription(completeness: ProfileCompleteness): string {
  if (completeness.isSafe) {
    return 'Your profile is complete for safe meal suggestions'
  }

  if (completeness.missingCritical.length > 0) {
    return `Critical safety info missing: ${completeness.missingCritical.join(', ')}`
  }

  if (completeness.missingOptional.length > 0) {
    return `Add ${completeness.missingOptional[0]} for better personalization`
  }

  return 'Profile incomplete'
}

/**
 * Get severity level for UI styling
 */
export function getSeverityLevel(completeness: ProfileCompleteness): 'critical' | 'warning' | 'info' | 'success' {
  if (!completeness.isSafe) return 'critical'
  if (completeness.score < 50) return 'warning'
  if (completeness.score < 80) return 'info'
  return 'success'
}
