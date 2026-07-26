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
  // ?patientId=<id> → complete an EXISTING member's health profile (guided flow from the
  // "Needs to Complete Onboarding" banner) rather than creating a new one.
  const existingPatientId = searchParams.get('patientId') || undefined

  const wizard = (
    <FamilyMemberOnboardingWizard
      initialMemberType={initialMemberType}
      existingPatientId={existingPatientId}
    />
  )

  return (
    <AuthGuard>
      {existingPatientId ? (
        // Completing an existing member is not adding a new patient — skip the multiple-patients
        // cap gate (the member already exists).
        wizard
      ) : (
        <FeatureGate feature="multiple-patients" featureName="Family Member Management">
          {wizard}
        </FeatureGate>
      )}
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
