/**
 * User Role Helper
 * Determines if user is a professional caregiver (nurse, doctor, etc.)
 * or a family caregiver, which affects terminology throughout the app
 */

import { UserProfile } from '@/types'

/**
 * Determine if user is a professional caregiver
 * Professional caregivers see "Patients" terminology
 * Family caregivers see "Family Members" terminology
 */
export function isProfessionalCaregiver(userProfile: UserProfile | null): boolean {
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
  const userRole = userProfile.profile?.caregiverType || userProfile.profile?.role

  return professionalRoles.includes(userRole?.toLowerCase() || '')
}

/**
 * Get the appropriate terminology for people being tracked
 * Returns "Patients" for professional caregivers, "Family Members" for family
 */
export function getTrackingTerminology(
  userProfile: UserProfile | null,
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
export function getTrackingPageTitle(userProfile: UserProfile | null): string {
  return getTrackingTerminology(userProfile, { singular: false })
}

/**
 * Get page subtitle based on user role
 */
export function getTrackingPageSubtitle(userProfile: UserProfile | null): string {
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
export function getAddButtonText(userProfile: UserProfile | null): string {
  const isProfessional = isProfessionalCaregiver(userProfile)

  if (isProfessional) {
    return 'Add Patient'
  } else {
    return 'Add Family Member'
  }
}
