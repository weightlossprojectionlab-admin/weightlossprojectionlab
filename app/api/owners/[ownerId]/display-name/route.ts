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
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
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

    // 3. Read the owner doc, compose display name from the best available field
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get()
    if (!ownerDoc.exists) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
    }
    const data = ownerDoc.data() || {}

    const composedFromParts =
      data.firstName && data.lastName
        ? `${data.firstName} ${data.lastName}`
        : data.firstName || data.lastName || ''
    const fromEmail = typeof data.email === 'string' ? data.email.split('@')[0] : ''
    const displayName =
      data.name ||
      data.displayName ||
      composedFromParts ||
      fromEmail ||
      'Family'

    return NextResponse.json({ id: ownerId, displayName })
  } catch (error: any) {
    logger.error('[API /owners/[id]/display-name GET] Error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
