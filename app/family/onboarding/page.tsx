/**
 * Family Member/Caregiver Onboarding Page
 *
 * Multi-step wizard for setting up family member or caregiver profiles.
 * Includes:
 * - Welcome introduction
 * - Basic info (name, phone, photo)
 * - Role & relationship selection
 * - Professional info (for medical professionals)
 * - Availability schedule
 * - Communication preferences
 * - Review & complete
 */

'use client'

import { OnboardingWizard } from '@/components/family/onboarding/OnboardingWizard'
import AuthGuard from '@/components/auth/AuthGuard'

export default function FamilyOnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingWizard />
    </AuthGuard>
  )
}
