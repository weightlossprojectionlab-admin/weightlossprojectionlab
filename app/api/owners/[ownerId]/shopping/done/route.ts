/**
 * POST /api/owners/[ownerId]/shopping/done
 *
 * Fan-out endpoint for the DONE side of a caregiver shopping session.
 * Fired by ActiveShoppingMode.handleConfirmPurchase after the items
 * have been marked purchased and the trip summary logged. Announces
 * "Sarah finished shopping" to the owner + every other accepted
 * familyMember, with item count + duration so the family sees the
 * actionable bits at a glance.
 *
 * Pair with /api/owners/[ownerId]/shopping/start. Together they bookend
 * the time window the family uses to plan around the caregiver's return.
 *
 * Auth: shared requireHouseholdAccess. Shopper identity comes from the
 * verified token, never from the body.
 *
 * Body: {
 *   sessionId: string         — shopping_sessions doc id
 *   storeName?: string        — destination (optional)
 *   itemsFound: number        — count from the trip summary
 *   itemsSkipped?: number     — items the caregiver couldn't find
 *   fromDutyId?: string       — linked household duty
 * }
 *
 * Duration is derived server-side from session.startedAt vs. now —
 * canonical source, not whatever the client claims.
 *
 * Best-effort fan-out: failures logged, never blocking. The caregiver's
 * checkout is the user-visible critical path; the bell is informational.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { recordInAppNotification } from '@/lib/notifications/dispatch'
import { requireHouseholdAccess } from '@/lib/api/household-access'
import type { ShoppingDoneMetadata } from '@/types/notifications'

interface RouteParams {
  params: Promise<{ ownerId: string }>
}

interface AnnounceDoneBody {
  sessionId: string
  storeName?: string
  itemsFound: number
  itemsSkipped?: number
  fromDutyId?: string
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { ownerId } = await params
    const auth = await requireHouseholdAccess(request, ownerId)
    if (auth instanceof Response) return auth

    let payload: AnnounceDoneBody
    try {
      payload = (await request.json()) as AnnounceDoneBody
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId.trim() : ''
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }
    const itemsFound = Number.isFinite(payload?.itemsFound) ? Math.max(0, Math.floor(payload.itemsFound)) : 0
    const itemsSkipped =
      payload?.itemsSkipped !== undefined && Number.isFinite(payload.itemsSkipped)
        ? Math.max(0, Math.floor(payload.itemsSkipped))
        : undefined

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

    let fromDutyName: string | undefined
    if (fromDutyId) {
      try {
        const dutyDoc = await adminDb.collection('household_duties').doc(fromDutyId).get()
        if (dutyDoc.exists) fromDutyName = dutyDoc.data()?.name
      } catch {
        // Informational; ignore.
      }
    }

    // Duration derived from session.startedAt (Firestore Timestamp).
    // Fall back to 0 if the timestamp is missing/malformed — better
    // than failing the announce.
    const startedAtDate: Date | null =
      typeof session.startedAt === 'object' && session.startedAt?.toDate
        ? (session.startedAt.toDate() as Date)
        : null
    const endedAtDate = new Date()
    const durationMs = startedAtDate
      ? Math.max(0, endedAtDate.getTime() - startedAtDate.getTime())
      : 0
    const durationMinutes = Math.round(durationMs / 60_000)

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

      const baseMetadata: ShoppingDoneMetadata = {
        sessionId,
        ownerId,
        shopperId: auth.callerUid,
        shopperName: auth.authorName,
        ...(storeName ? { storeName } : {}),
        ...(fromDutyId ? { fromDutyId } : {}),
        ...(fromDutyName ? { fromDutyName } : {}),
        itemsFound,
        ...(itemsSkipped !== undefined ? { itemsSkipped } : {}),
        startedAt: startedAtDate ? startedAtDate.toISOString() : endedAtDate.toISOString(),
        endedAt: endedAtDate.toISOString(),
        durationMinutes,
      }

      // Title surfaces the most useful summary: count + store, with
      // duration baked into the message for color.
      const titleSuffix = storeName ? ` at ${storeName}` : ''
      const itemCountStr = `${itemsFound} item${itemsFound === 1 ? '' : 's'}`
      const durStr = durationMinutes > 0 ? ` · ${durationMinutes} min` : ''
      const skippedStr =
        itemsSkipped && itemsSkipped > 0 ? ` (${itemsSkipped} skipped)` : ''
      const message = `${itemCountStr}${skippedStr}${durStr}${
        fromDutyName ? ` · ${fromDutyName}` : ''
      }`

      await Promise.all(
        recipients.map((r) =>
          recordInAppNotification({
            userId: r.userId,
            type: 'shopping_done',
            // Done events bump priority for the owner — actionable
            // ("plan dinner around this") in a way the start event isn't.
            priority: r.isOwner ? 'normal' : 'low',
            title: `${auth.authorName} finished shopping${titleSuffix}`,
            message,
            actionUrl: r.isOwner ? '/family/dashboard' : `/caregiver/${ownerId}`,
            actionLabel: 'View',
            metadata: baseMetadata,
            expiresInDays: 7, // keep the done event around longer than start
          }).then(() => {
            notifiedCount += 1
          }).catch((err) => {
            logger.warn('[shopping/done] notification dispatch failed', {
              recipient: r.userId,
              sessionId,
              error: err?.message,
            })
          }),
        ),
      )
    } catch (notifyError: any) {
      logger.warn('[shopping/done] notification fan-out failed', {
        sessionId,
        error: notifyError?.message,
      })
    }

    return NextResponse.json({ ok: true, notifiedCount, durationMinutes }, { status: 201 })
  } catch (error: any) {
    logger.error('[API /owners/[id]/shopping/done POST] Error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
