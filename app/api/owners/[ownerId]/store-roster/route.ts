/**
 * GET /api/owners/[ownerId]/store-roster
 *
 * Returns the household's chosen store catalog ids — the same field
 * (`householdStoreIds`) that useStoreRoster reads via Firestore for
 * the OWNER's own view. Caregivers reach the roster via this endpoint
 * because /users/{ownerId} is rule-guarded to owner-only reads
 * (subscription / profile / managedBy fields shouldn't leak), and we
 * don't want to broaden that rule just to expose one safe field.
 *
 * Auth: same `requireHouseholdAccess` gate as the handoff-notes +
 * shopping-event endpoints. Caller is the owner OR has an accepted
 * familyMembers entry on this owner.
 *
 * Response shape:
 *   { ids: string[] } — catalog ids (e.g. ['walmart', 'walgreens'])
 *
 * No write endpoint — owners write to their own user doc directly
 * via the client SDK (owner self can read/write their own /users
 * doc per existing rules). The asymmetry is intentional: writes
 * stay in the owner's hands; reads fan out via this gate.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { requireHouseholdAccess } from '@/lib/api/household-access'

interface RouteParams {
  params: Promise<{ ownerId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ownerId } = await params
    const auth = await requireHouseholdAccess(request, ownerId)
    if (auth instanceof Response) return auth

    const userDoc = await adminDb.collection('users').doc(ownerId).get()
    const data = userDoc.exists ? userDoc.data() || {} : {}
    const raw = Array.isArray(data.householdStoreIds)
      ? data.householdStoreIds
      : []
    const ids = raw.filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    )

    return NextResponse.json({ ids })
  } catch (error: any) {
    logger.error('[API /owners/[id]/store-roster GET] Error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
