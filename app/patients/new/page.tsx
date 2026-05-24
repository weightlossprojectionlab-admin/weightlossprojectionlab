/**
 * New Family Member Page
 * Wizard-style onboarding for adding family members
 * Now with feature gating for multiple patients
 *
 * Deep-link query params (consumed below):
 *   ?type=pet|human|newborn
 *     Seeds the wizard's initialMemberType so onboarding can route
 *     the user directly into the pet path after they answered "Yes"
 *     on the has_pets nudge. Without this prop the wizard starts on
 *     its own type_selection step (default behavior).
 */

'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import FamilyMemberOnboardingWizard from '@/components/family/FamilyMemberOnboardingWizard'
import { FeatureGate } from '@/components/subscription'

function NewPatientContent() {
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type')
  const initialMemberType =
    typeParam === 'pet' || typeParam === 'human' || typeParam === 'newborn'
      ? typeParam
      : undefined

  return (
    <AuthGuard>
      <FeatureGate
        feature="multiple-patients"
        featureName="Family Member Management"
      >
        <FamilyMemberOnboardingWizard initialMemberType={initialMemberType} />
      </FeatureGate>
    </AuthGuard>
  )
}

export default function NewPatientPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <NewPatientContent />
    </Suspense>
  )
}
