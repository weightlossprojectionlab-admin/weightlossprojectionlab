/**
 * New Family Member Page
 * Wizard-style onboarding for adding family members
 * Now with feature gating for multiple patients
 */

'use client'

import AuthGuard from '@/components/auth/AuthGuard'
import FamilyMemberOnboardingWizard from '@/components/family/FamilyMemberOnboardingWizard'
import { FeatureGate } from '@/components/subscription'

export default function NewPatientPage() {
  return (
    <AuthGuard>
      <FeatureGate
        feature="multiple-patients"
        featureName="Family Member Management"
      >
        <FamilyMemberOnboardingWizard />
      </FeatureGate>
    </AuthGuard>
  )
}
