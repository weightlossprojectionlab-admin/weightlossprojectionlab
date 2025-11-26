/**
 * New Family Member Page
 * Wizard-style onboarding for adding family members
 */

'use client'

import AuthGuard from '@/components/auth/AuthGuard'
import FamilyMemberOnboardingWizard from '@/components/family/FamilyMemberOnboardingWizard'

export default function NewPatientPage() {
  return (
    <AuthGuard>
      <FamilyMemberOnboardingWizard />
    </AuthGuard>
  )
}
