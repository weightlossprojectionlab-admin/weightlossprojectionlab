/**
 * GET /api/owners/[ownerId]/display-name
 *
 * Returns the display name of an account owner so caregivers (and the
 * owner themselves) can render the right name in the AccountSwitcher,
 * shift-view worklist, handoff log, etc.
 *
 * Why a server endpoint:
 *   Firestore rules block caregivers from reading other users' full
 *   docs via the client SDK. Source of truth for an owner's name is
 *   users/{ownerId}.name — this endpoint bypasses the rules with the
 *   admin SDK after explicitly verifying the caller has caregiver
 *   access to the owner (or IS the owner).
 *
 * Semantic intent: the verb is "what is THIS owner's display name?"
 * Answer lives in one place — the owner's user doc — and one endpoint
 * surfaces it. DRY: no denormalized copies elsewhere.
 *
 * Auth check:
 *   - Caller must be authenticated.
 *   - Caller must be the owner OR have a caregiverOf entry whose
 *     accountOwnerId === ownerId.
 *
 * Returns:
 *   200 { id, displayName }
 *   401 if no auth
 *   403 if no caregiver relationship
 *   404 if owner doc doesn't exist
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ ownerId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ownerId } = await params

    // 1. Verify caller
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }
    const idToken = authHeader.split('Bearer ')[1]

    let callerUid: string
    try {
      const decoded = await verifyIdToken(idToken)
      callerUid = decoded.uid
    } catch (err: any) {
      return NextResponse.json({ error: 'Token verification failed' }, { status: 401 })
    }

    // 2. Authorize: caller is the owner, OR has caregiver access
    if (callerUid !== ownerId) {
      const callerDoc = await adminDb.collection('users').doc(callerUid).get()
      const callerData = callerDoc.data() as { caregiverOf?: Array<{ accountOwnerId: string }> } | undefined
      const isCaregiver = (callerData?.caregiverOf || []).some((c) => c.accountOwnerId === ownerId)
      if (!isCaregiver) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // 3. Try both sources of truth: Firestore first (preferred — that's
    //    where the user actively edits their profile), then Firebase Auth
    //    (where signup providers — Google, email — populated displayName
    //    and email). Some legacy or partially-onboarded owners have the
    //    Auth record but no Firestore name fields; falling through ensures
    //    we surface SOMETHING real instead of the "Family" sentinel.
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get()
    const firestoreData = ownerDoc.exists ? (ownerDoc.data() || {}) : null

    let authData: { displayName?: string | null; email?: string | null } | null = null
    try {
      const authUser = await adminAuth.getUser(ownerId)
      authData = { displayName: authUser.displayName, email: authUser.email }
    } catch {
      // No Auth record for this UID. That's OK if Firestore has data;
      // if neither source has anything we 404 below.
    }

    if (!firestoreData && !authData) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
    }

    const composedFromParts =
      firestoreData?.firstName && firestoreData?.lastName
        ? `${firestoreData.firstName} ${firestoreData.lastName}`
        : firestoreData?.firstName || firestoreData?.lastName || ''
    const firestoreFromEmail =
      typeof firestoreData?.email === 'string' ? firestoreData.email.split('@')[0] : ''
    const authFromEmail =
      typeof authData?.email === 'string' ? authData.email.split('@')[0] : ''

    const displayName =
      firestoreData?.name ||
      firestoreData?.displayName ||
      composedFromParts ||
      firestoreFromEmail ||
      authData?.displayName ||
      authFromEmail ||
      'Family'

    return NextResponse.json({ id: ownerId, displayName })
  } catch (error: any) {
    logger.error('[API /owners/[id]/display-name GET] Error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
