/**
 * GET /api/owners/[ownerId]/plan
 *
 * Returns the account owner's subscription so a caregiver's client can gate
 * on the OWNER's plan ("one account, many seats") — write locks, feature
 * availability, the read-only banner.
 *
 * Why a server endpoint:
 *   Firestore rules block caregivers from reading another user's doc via the
 *   client SDK (firestore.rules users/{userId} read = owner/admin only), so the
 *   client-side onSnapshot mirror silently fails. This endpoint reads the
 *   owner's subscription with the admin SDK AFTER verifying the caller has
 *   caregiver access (or IS the owner). Mirrors /api/owners/[ownerId]/display-name.
 *
 * Auth:
 *   - Caller must be authenticated.
 *   - Caller must be the owner OR have a caregiverOf entry for ownerId.
 *
 * Returns:
 *   200 { ownerId, subscription: UserSubscription | null }
 *   401 no auth · 403 no relationship · 404 owner doc missing
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { FULL_ACCESS_SUBSCRIPTION } from '@/lib/feature-gates'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ ownerId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ownerId } = await params

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }
    const idToken = authHeader.split('Bearer ')[1]

    let callerUid: string
    try {
      callerUid = (await verifyIdToken(idToken)).uid
    } catch {
      return NextResponse.json({ error: 'Token verification failed' }, { status: 401 })
    }

    // Authorize: caller is the owner OR a caregiver of the owner.
    if (callerUid !== ownerId) {
      const callerDoc = await adminDb.collection('users').doc(callerUid).get()
      const callerData = callerDoc.data() as { caregiverOf?: Array<{ accountOwnerId: string }> } | undefined
      const isCaregiver = (callerData?.caregiverOf || []).some((c) => c.accountOwnerId === ownerId)
      if (!isCaregiver) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const ownerDoc = await adminDb.collection('users').doc(ownerId).get()
    if (!ownerDoc.exists) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
    }

    const ownerData = ownerDoc.data() ?? {}
    // A super-admin owner's EFFECTIVE plan is full access (matches the bypass in
    // getUserSubscription), so caregivers inherit the right access rather than
    // the owner's (often empty) stored subscription record.
    const subscription = isSuperAdmin(ownerData.email as string | undefined)
      ? FULL_ACCESS_SUBSCRIPTION
      : (ownerData.subscription ?? null)

    return NextResponse.json({ ownerId, subscription })
  } catch (error: any) {
    logger.error('[API /owners/[id]/plan GET] Error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
