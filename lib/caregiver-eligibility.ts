/**
 * Caregiver Eligibility Utilities
 *
 * Age-based logic for determining if a family member can be a caregiver
 * and what permission level they should have
 */

export const CAREGIVER_AGE_RULES = {
  MINIMUM_AGE: 13, // Absolute minimum to be a caregiver
  TRUSTED_MINOR_MAX: 17, // Requires owner approval
  AUTOMATIC_APPROVAL: 18, // Full caregiver rights without approval
} as const

export type CaregiverEligibilityResult = {
  eligible: boolean
  requiresTrust: boolean
  reason?: string
  recommendedPermission: 'none' | 'view_only' | 'limited' | 'full'
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

/**
 * Determine if a family member is eligible to be a caregiver based on age
 */
export function checkCaregiverEligibility(
  dateOfBirth: string,
  trustedByOwner: boolean = false
): CaregiverEligibilityResult {
  const age = calculateAge(dateOfBirth)

  // Under 13: Not eligible
  if (age < CAREGIVER_AGE_RULES.MINIMUM_AGE) {
    return {
      eligible: false,
      requiresTrust: false,
      reason: `Too young to be a caregiver (age ${age}). Minimum age is ${CAREGIVER_AGE_RULES.MINIMUM_AGE}.`,
      recommendedPermission: 'none',
    }
  }

  // Ages 13-17: Requires owner trust
  if (age >= CAREGIVER_AGE_RULES.MINIMUM_AGE && age <= CAREGIVER_AGE_RULES.TRUSTED_MINOR_MAX) {
    if (trustedByOwner) {
      return {
        eligible: true,
        requiresTrust: true,
        reason: `Minor (age ${age}) trusted by account owner`,
        recommendedPermission: 'limited', // Start with limited for minors
      }
    } else {
      return {
        eligible: false,
        requiresTrust: true,
        reason: `Minors (age ${age}) require account owner trust to be caregivers`,
        recommendedPermission: 'none',
      }
    }
  }

  // 18+: Automatically eligible
  return {
    eligible: true,
    requiresTrust: false,
    reason: `Adult (age ${age}) - automatically eligible`,
    recommendedPermission: 'full', // Adults can start with full permissions
  }
}

/**
 * Get human-readable age group for display
 */
export function getAgeGroup(dateOfBirth: string): string {
  const age = calculateAge(dateOfBirth)

  if (age < 13) return 'Child'
  if (age >= 13 && age <= 17) return 'Teen'
  if (age >= 18 && age < 65) return 'Adult'
  return 'Senior'
}

/**
 * Format trust prompt message for account owner
 */
export function getTrustPromptMessage(name: string, age: number): string {
  return `${name} is ${age} years old. Do you trust them to responsibly manage sensitive health information as a caregiver?`
}

/**
 * Get permission level description
 */
export function getPermissionLevelDescription(level: 'none' | 'view_only' | 'limited' | 'full'): string {
  const descriptions = {
    none: 'Cannot access patient records',
    view_only: 'Can view health data but cannot make changes',
    limited: 'Can log meals, weight, and steps. Cannot edit medical records.',
    full: 'Full access to view and manage all health data',
  }
  return descriptions[level]
}

/**
 * Get recommended permission levels for an age group
 */
export function getRecommendedPermissionsForAge(age: number): ('view_only' | 'limited' | 'full')[] {
  if (age < 13) {
    return [] // Not eligible
  }

  if (age >= 13 && age <= 17) {
    return ['view_only', 'limited'] // Minors should not have full access by default
  }

  return ['view_only', 'limited', 'full'] // Adults can have any level
}

/**
 * Validate if a permission level is appropriate for age
 */
export function isPermissionLevelAppropriateForAge(
  age: number,
  permissionLevel: 'none' | 'view_only' | 'limited' | 'full'
): boolean {
  if (age < 13) {
    return permissionLevel === 'none'
  }

  if (age >= 13 && age <= 17) {
    // Minors should not have full access without additional confirmation
    return permissionLevel === 'view_only' || permissionLevel === 'limited'
  }

  // Adults can have any permission level
  return true
}
