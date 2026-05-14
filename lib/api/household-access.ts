/**
 * Shared household-access auth helper for API routes scoped under an
 * /api/owners/[ownerId]/... path.
 *
 * Semantic intent: any household-shared surface (handoff notes, shopping
 * events, future caregiver-driven event fan-outs) needs the same auth
 * contract — caller is the owner OR has an accepted familyMembers entry
 * on this owner. This module is the canonical implementation; route
 * handlers import it instead of redefining the logic per file.
 *
 * Originally inline in app/api/owners/[ownerId]/handoff-notes; extracted
 * when the shopping-events endpoints needed the same gate.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'

export interface HouseholdAccessContext {
  callerUid: string
  /** Best-effort display name for the caller — owner's `name` /
   *  `displayName`, falling back to the familyMembers doc's `name` /
   *  `email`, falling back to a role-flavored placeholder. Used to fill
   *  notification titles ("Sarah added to the care log"). */
  authorName: string
  /** True when the caller IS the owner of this household; false when
   *  they're a caregiver acting on the owner's behalf. */
  isOwner: boolean
}

/**
 * Verify the caller is authenticated AND has access to this household.
 * Returns the caller context on success, or a Response on failure that
 * the route handler should return as-is.
 */
export async function requireHouseholdAccess(
  request: NextRequest,
  ownerId: string,
): Promise<HouseholdAccessContext | Response> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid authorization header' },
      { status: 401 },
    )
  }
  const idToken = authHeader.split('Bearer ')[1]

  let callerUid: string
  try {
    const decoded = await verifyIdToken(idToken)
    callerUid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Token verification failed' }, { status: 401 })
  }

  // Owner always allowed.
  if (callerUid === ownerId) {
    const ownerDoc = await adminDb.collection('users').doc(callerUid).get()
    const authorName =
      ownerDoc.data()?.name ||
      ownerDoc.data()?.displayName ||
      'Account owner'
    return { callerUid, authorName, isOwner: true }
  }

  // Otherwise, must have an accepted familyMembers entry on this owner.
  const memberQuery = await adminDb
    .collection('users')
    .doc(ownerId)
    .collection('familyMembers')
    .where('userId', '==', callerUid)
    .where('status', '==', 'accepted')
    .limit(1)
    .get()
  if (memberQuery.empty) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const memberData = memberQuery.docs[0].data() || {}
  const authorName = memberData.name || memberData.email || 'Caregiver'
  return { callerUid, authorName, isOwner: false }
}
