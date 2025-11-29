/**
 * User Role Helper
 * Determines if user is a professional caregiver (nurse, doctor, etc.)
 * or a family caregiver, which affects terminology throughout the app
 */

import { User } from '@/types'

/**
 * Determine if user is a professional caregiver
 * Professional caregivers see "Patients" terminology
 * Family caregivers see "Family Members" terminology
 */
export function isProfessionalCaregiver(userProfile: User | null): boolean {
  if (!userProfile) return false

  const professionalRoles = [
    'nurse',
    'doctor',
    'physician',
    'healthcare_provider',
    'medical_professional',
    'caregiver_professional'
  ]

  // Check if user has a professional role set in their profile
  // Note: UserProfile doesn't have nested profile property, check onboardingAnswers instead
  const primaryRole = userProfile.preferences?.onboardingAnswers?.primaryRole

  // Professional caregivers have 'caregiver' as primaryRole and userMode 'caregiver'
  const userMode = userProfile.preferences?.userMode
  const isProfessional = userMode === 'caregiver' && primaryRole === 'caregiver'

  return isProfessional
}

/**
 * Get the appropriate terminology for people being tracked
 * Returns "Patients" for professional caregivers, "Family Members" for family
 */
export function getTrackingTerminology(
  userProfile: User | null,
  options: {
    singular?: boolean
    lowercase?: boolean
  } = {}
): string {
  const { singular = false, lowercase = false } = options

  const isProfessional = isProfessionalCaregiver(userProfile)

  let term = ''
  if (isProfessional) {
    term = singular ? 'Patient' : 'Patients'
  } else {
    term = singular ? 'Family Member' : 'Family Members'
  }

  return lowercase ? term.toLowerCase() : term
}

/**
 * Get page title based on user role
 */
export function getTrackingPageTitle(userProfile: User | null): string {
  return getTrackingTerminology(userProfile, { singular: false })
}

/**
 * Get page subtitle based on user role
 */
export function getTrackingPageSubtitle(userProfile: User | null): string {
  const isProfessional = isProfessionalCaregiver(userProfile)

  if (isProfessional) {
    return 'Manage health records for your patients'
  } else {
    return 'Manage health records for family members and pets'
  }
}

/**
 * Get "Add" button text based on user role
 */
export function getAddButtonText(userProfile: User | null): string {
  const isProfessional = isProfessionalCaregiver(userProfile)

  if (isProfessional) {
    return 'Add Patient'
  } else {
    return 'Add Family Member'
  }
}
