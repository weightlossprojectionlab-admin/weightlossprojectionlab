/**
 * GET /api/me/duties
 *
 * Returns active household duties assigned to the caller across EVERY
 * household they belong to. The worklist consumer (the Today view) joins
 * this with overdue vitals, due meds, etc. to compose a caregiver's
 * cross-household task list.
 *
 * Semantic intent: "what has the family asked ME to do?" Single source
 * for the answer. Owner can assign duties via /family/dashboard's
 * Household Duties tab; caregivers read what's queued for them here.
 *
 * Auth: any authenticated caller. Server filters duties by
 * assignedTo array-contains callerUid, so a user can only see their
 * own assignments regardless of household membership.
 *
 * Query: collection('household_duties') is a top-level collection keyed
 * by duty id. Filter pattern:
 *   .where('assignedTo', 'array-contains', callerUid)
 *   .where('isActive', '==', true)
 * Status filter (completed/skipped excluded) applied client-side to
 * avoid forcing a composite index this early.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import type { HouseholdDuty } from '@/types/household-duties'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }
    const idToken = authHeader.split('Bearer ')[1]

    let callerUid: string
    try {
      const decoded = await verifyIdToken(idToken)
      callerUid = decoded.uid
    } catch {
      return NextResponse.json({ error: 'Token verification failed' }, { status: 401 })
    }

    const snap = await adminDb
      .collection('household_duties')
      .where('assignedTo', 'array-contains', callerUid)
      .where('isActive', '==', true)
      .get()

    // Drop completed / skipped at the boundary; the worklist only wants
    // open items. (Both states keep their docs around for audit /
    // history surfaces.)
    const items: HouseholdDuty[] = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<HouseholdDuty, 'id'>) }))
      .filter((d) => d.status !== 'completed' && d.status !== 'skipped')

    return NextResponse.json({ items })
  } catch (error: any) {
    logger.error('[API /me/duties GET] Error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
