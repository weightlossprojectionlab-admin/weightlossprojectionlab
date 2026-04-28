'use client'

/**
 * Household Shopping List (caregiver view).
 *
 * Standalone page at /households/{id}/shopping?dutyId=<id>. Caregivers
 * land here from duty notification CTAs and from the menu when acting
 * on behalf of another household. Renders the shared
 * HouseholdCaregiverShopping component, which talks to
 * /api/households/[id]/shopping/... (admin SDK on the server, since
 * Firestore client rules block cross-user shopping_items access).
 *
 * Owners use /shopping (their own list) — no router branching here.
 */

import { useParams, useSearchParams } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import { HouseholdCaregiverShopping } from '@/components/shopping/HouseholdCaregiverShopping'

export default function HouseholdShoppingPage() {
  const params = useParams<{ householdId: string }>()
  const searchParams = useSearchParams()
  const householdId = params.householdId
  const dutyId = searchParams.get('dutyId')

  return (
    <AuthGuard>
      <HouseholdCaregiverShopping householdId={householdId} dutyId={dutyId} />
    </AuthGuard>
  )
}
