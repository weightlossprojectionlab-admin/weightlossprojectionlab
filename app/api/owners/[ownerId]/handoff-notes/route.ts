/**
 * Handoff notes API
 *
 *   GET  /api/owners/[ownerId]/handoff-notes?limit=20
 *   POST /api/owners/[ownerId]/handoff-notes
 *
 * The substrate for the shift-view handoff log (UI in P4). Notes live at
 * users/{ownerId}/handoffNotes/{noteId} so they're naturally scoped to
 * the household and follow the same access-control story as the rest of
 * the owner-rooted data.
 *
 * Auth: caller is the owner OR has an accepted familyMembers entry on
 * this owner. Same rule pattern as /api/owners/[id]/display-name; the
 * subscription gate is intentionally NOT applied — notes are read AND
 * write for caregivers regardless of the owner's billing state (they
 * don't cost anything to store, and a terminated subscription
 * shouldn't silence a caregiver's handoff).
 *
 * Validation:
 *   - body: required, max 2000 chars
 *   - patientIds: optional string[]
 *   - flaggedForOwner: optional boolean
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import type { HandoffNote, CreateHandoffNoteInput } from '@/types/handoff'

interface RouteParams {
  params: Promise<{ ownerId: string }>
}

const BODY_MAX = 2000
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

interface AuthorContext {
  callerUid: string
  authorName: string
}

/**
 * Verify the caller is authenticated AND has access to this household.
 * Returns the caller context on success, or a Response on failure.
 */
async function requireHouseholdAccess(
  request: NextRequest,
  ownerId: string,
): Promise<AuthorContext | Response> {
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

  // Owner always allowed.
  let authorName = 'Family member'
  if (callerUid === ownerId) {
    const ownerDoc = await adminDb.collection('users').doc(callerUid).get()
    authorName = ownerDoc.data()?.name || ownerDoc.data()?.displayName || 'Account owner'
    return { callerUid, authorName }
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
  authorName = memberData.name || memberData.email || 'Caregiver'
  return { callerUid, authorName }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ownerId } = await params
    const auth = await requireHouseholdAccess(request, ownerId)
    if (auth instanceof Response) return auth

    const url = new URL(request.url)
    const rawLimit = parseInt(url.searchParams.get('limit') || '', 10)
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : DEFAULT_LIMIT

    const snap = await adminDb
      .collection('users')
      .doc(ownerId)
      .collection('handoffNotes')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    const notes: HandoffNote[] = snap.docs.map((doc) => {
      const data = doc.data() || {}
      return {
        id: doc.id,
        ownerId,
        authorId: data.authorId,
        authorName: data.authorName,
        body: data.body,
        patientIds: data.patientIds,
        flaggedForOwner: data.flaggedForOwner,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    })

    return NextResponse.json({ items: notes })
  } catch (error: any) {
    logger.error('[API /owners/[id]/handoff-notes GET] Error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { ownerId } = await params
    const auth = await requireHouseholdAccess(request, ownerId)
    if (auth instanceof Response) return auth

    let payload: CreateHandoffNoteInput
    try {
      payload = (await request.json()) as CreateHandoffNoteInput
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const body = typeof payload?.body === 'string' ? payload.body.trim() : ''
    if (!body) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 })
    }
    if (body.length > BODY_MAX) {
      return NextResponse.json(
        { error: `body exceeds ${BODY_MAX} characters` },
        { status: 400 },
      )
    }

    const patientIds = Array.isArray(payload?.patientIds)
      ? payload.patientIds.filter((p) => typeof p === 'string' && p.length > 0)
      : undefined
    const flaggedForOwner = payload?.flaggedForOwner === true

    const now = new Date().toISOString()
    const noteData: Omit<HandoffNote, 'id'> = {
      ownerId,
      authorId: auth.callerUid,
      authorName: auth.authorName,
      body,
      ...(patientIds && patientIds.length > 0 ? { patientIds } : {}),
      ...(flaggedForOwner ? { flaggedForOwner: true } : {}),
      createdAt: now,
      updatedAt: now,
    }

    const ref = await adminDb
      .collection('users')
      .doc(ownerId)
      .collection('handoffNotes')
      .add(noteData)

    const note: HandoffNote = { id: ref.id, ...noteData }
    return NextResponse.json({ note }, { status: 201 })
  } catch (error: any) {
    logger.error('[API /owners/[id]/handoff-notes POST] Error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
