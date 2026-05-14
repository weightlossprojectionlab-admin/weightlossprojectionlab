/**
 * POST /api/owners/[ownerId]/shopping/start
 *
 * Fan-out endpoint for the START side of a caregiver shopping session.
 * Fired by ActiveShoppingMode when a session opens (or the page mounts
 * with an active session). Announces "Sarah started shopping" to the
 * owner + every other accepted familyMember.
 *
 * Pair with /api/owners/[ownerId]/shopping/done so the family has a
 * Start/Done time window to plan around — the original "orchestrate
 * the delivery time" arc.
 *
 * Auth: shared requireHouseholdAccess — same gate as handoff-notes.
 * Caller must be the owner OR have an accepted familyMembers entry on
 * this owner. The shopper's identity is the verified caller, NOT
 * anything passed in the body (so the caller can't spoof who's
 * shopping).
 *
 * Body: { sessionId, storeName?, fromDutyId? }
 *   - sessionId is the doc id from shopping_sessions; we look it up
 *     server-side to verify it exists and was created by this caller.
 *   - storeName is the brand/destination ("Walgreens"). Optional;
 *     when set, the bell title carries it ("started shopping at X").
 *   - fromDutyId links the session to a household duty the caregiver
 *     tapped on the Today view. The bell metadata includes the duty
 *     name so the recipient can click through for context.
 *
 * Notification audience (mirrors handoff-notes):
 *   - Owner (always, unless caller IS the owner)
 *   - Every accepted familyMember minus the caller
 *
 * Best-effort: fan-out failures are logged but don't block the
 * response — losing a bell badge is much less bad than blocking the
 * caregiver's in-store flow on a transient write error.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { recordInAppNotification } from '@/lib/notifications/dispatch'
import { requireHouseholdAccess } from '@/lib/api/household-access'
import type { ShoppingStartedMetadata } from '@/types/notifications'

interface RouteParams {
  params: Promise<{ ownerId: string }>
}

interface AnnounceStartBody {
  sessionId: string
  storeName?: string
  fromDutyId?: string
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { ownerId } = await params
    const auth = await requireHouseholdAccess(request, ownerId)
    if (auth instanceof Response) return auth

    let payload: AnnounceStartBody
    try {
      payload = (await request.json()) as AnnounceStartBody
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId.trim() : ''
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    // Server-side session lookup — verifies the session exists and was
    // created by the caller. Prevents a different signed-in user from
    // announcing on someone else's session.
    const sessionDoc = await adminDb.collection('shopping_sessions').doc(sessionId).get()
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    const session = sessionDoc.data() || {}
    if (session.userId !== auth.callerUid) {
      return NextResponse.json({ error: 'Not your session' }, { status: 403 })
    }

    const storeName = typeof payload?.storeName === 'string' ? payload.storeName.trim() : undefined
    const fromDutyId = typeof payload?.fromDutyId === 'string' ? payload.fromDutyId.trim() : undefined

    // Optional duty lookup — surface the duty name in the bell so the
    // recipient sees "Sarah started shopping for Weekly Groceries"
    // instead of just "Sarah started shopping."
    let fromDutyName: string | undefined
    if (fromDutyId) {
      try {
        const dutyDoc = await adminDb.collection('household_duties').doc(fromDutyId).get()
        if (dutyDoc.exists) fromDutyName = dutyDoc.data()?.name
      } catch {
        // Duty lookup is informational — failure shouldn't block the announce.
      }
    }

    const startedAt =
      typeof session.startedAt === 'object' && session.startedAt?.toDate
        ? (session.startedAt.toDate() as Date).toISOString()
        : new Date().toISOString()

    // Build the audience and fire notifications. Same shape as
    // handoff-notes — owner + accepted familyMembers minus the actor.
    let notifiedCount = 0
    try {
      const familyMembersSnap = await adminDb
        .collection('users')
        .doc(ownerId)
        .collection('familyMembers')
        .where('status', '==', 'accepted')
        .get()

      const recipients: Array<{ userId: string; isOwner: boolean }> = []
      if (auth.callerUid !== ownerId) {
        recipients.push({ userId: ownerId, isOwner: true })
      }
      for (const doc of familyMembersSnap.docs) {
        const memberUserId = doc.data()?.userId
        if (!memberUserId || memberUserId === auth.callerUid) continue
        recipients.push({ userId: memberUserId, isOwner: false })
      }

      const baseMetadata: ShoppingStartedMetadata = {
        sessionId,
        ownerId,
        shopperId: auth.callerUid,
        shopperName: auth.authorName,
        ...(storeName ? { storeName } : {}),
        ...(fromDutyId ? { fromDutyId } : {}),
        ...(fromDutyName ? { fromDutyName } : {}),
        startedAt,
      }

      const titleSuffix = storeName ? ` at ${storeName}` : ''
      const message = fromDutyName
        ? `For ${fromDutyName}${storeName ? ` · ${storeName}` : ''}`
        : storeName
          ? `Shopping at ${storeName}`
          : 'In-store shopping in progress'

      await Promise.all(
        recipients.map((r) =>
          recordInAppNotification({
            userId: r.userId,
            type: 'shopping_started',
            priority: 'normal',
            title: `${auth.authorName} started shopping${titleSuffix}`,
            message,
            // Owner clicks through to dashboard (where the active-shopper
            // pill lives in Phase 3); other caregivers see the bell as
            // a heads-up, no specific destination yet.
            actionUrl: r.isOwner ? '/family/dashboard' : `/caregiver/${ownerId}`,
            actionLabel: 'View',
            metadata: baseMetadata,
            expiresInDays: 1, // start-event is ephemeral — the done event supersedes
          }).then(() => {
            notifiedCount += 1
          }).catch((err) => {
            logger.warn('[shopping/start] notification dispatch failed', {
              recipient: r.userId,
              sessionId,
              error: err?.message,
            })
          }),
        ),
      )
    } catch (notifyError: any) {
      logger.warn('[shopping/start] notification fan-out failed', {
        sessionId,
        error: notifyError?.message,
      })
    }

    return NextResponse.json({ ok: true, notifiedCount }, { status: 201 })
  } catch (error: any) {
    logger.error('[API /owners/[id]/shopping/start POST] Error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
