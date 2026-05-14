/**
 * POST   /api/household-duties/[dutyId]/claim — claim a multi-assigned duty
 * DELETE /api/household-duties/[dutyId]/claim — release a claim the caller holds
 *
 * Phase 0d task gating. When a duty has multiple assignees (assignedTo
 * length > 1), the owner is offering it to a pool — only one caregiver
 * should actually do the work. The claim transaction lets the first
 * caregiver to tap "Take this" lock the duty for themselves; other
 * assignees see "Claimed by X" on their shift view and route to other
 * work, avoiding the double-shop / duplicate-effort problem.
 *
 * Race safety: the read-then-write is wrapped in `db.runTransaction`
 * so two simultaneous POSTs from different caregivers see consistent
 * state. Whoever's commit lands first wins; the other gets 409.
 *
 * No-ops:
 *   • Single-assigned duty (assignedTo.length === 1) auto-claims at
 *     creation time (route.ts on duty create). POST here returns 200
 *     with status: 'already_claimed_by_caller' if the caller is the
 *     existing claimer; 409 otherwise.
 *   • Re-claiming your own claim returns 200 idempotently.
 *
 * Auth: same pattern as /complete. Caller must be in assignedTo[] (or
 * be the duty's userId, i.e. the owner). Cross-household claims would
 * have already failed the assignedTo check.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { HouseholdDuty } from '@/types/household-duties'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ dutyId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dutyId } = await params
    const callerUid = authResult.userId
    const db = getAdminDb()
    const dutyRef = db.collection('household_duties').doc(dutyId)

    const result = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(dutyRef)
      if (!snap.exists) {
        return { ok: false as const, status: 404, error: 'Duty not found' }
      }
      const duty = snap.data() as HouseholdDuty

      // Authorization: caller must be in assignedTo (or be the owner
      // who created the duty, who retains the right to claim).
      const isAssignee = Array.isArray(duty.assignedTo) && duty.assignedTo.includes(callerUid)
      const isOwner = duty.userId === callerUid
      if (!isAssignee && !isOwner) {
        return { ok: false as const, status: 403, error: 'Not assigned to this duty' }
      }

      // Already claimed by caller — idempotent no-op.
      if (duty.claimedBy === callerUid) {
        return { ok: true as const, status: 200, body: { status: 'already_claimed_by_caller', claimedBy: callerUid, claimedAt: duty.claimedAt } }
      }

      // Claimed by someone else — race lost.
      if (duty.claimedBy && duty.claimedBy !== callerUid) {
        return {
          ok: false as const,
          status: 409,
          error: `Already claimed by ${duty.claimedBy}`,
          body: { claimedBy: duty.claimedBy, claimedAt: duty.claimedAt },
        }
      }

      // Unclaimed — set the claim.
      const now = new Date().toISOString()
      transaction.update(dutyRef, {
        claimedBy: callerUid,
        claimedAt: now,
        lastModified: now,
        modifiedBy: callerUid,
      })
      return { ok: true as const, status: 200, body: { status: 'claimed', claimedBy: callerUid, claimedAt: now } }
    })

    if (!result.ok) {
      logger.info('Duty claim rejected', { dutyId, callerUid, status: result.status, reason: result.error })
      return NextResponse.json(
        { error: result.error, ...(('body' in result) ? result.body : {}) },
        { status: result.status },
      )
    }

    logger.info('Duty claimed', { dutyId, callerUid, status: result.body.status })
    return NextResponse.json(result.body, { status: 200 })
  } catch (error: any) {
    logger.error('[API /household-duties/[id]/claim POST] Error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dutyId } = await params
    const callerUid = authResult.userId
    const db = getAdminDb()
    const dutyRef = db.collection('household_duties').doc(dutyId)

    const result = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(dutyRef)
      if (!snap.exists) {
        return { ok: false as const, status: 404, error: 'Duty not found' }
      }
      const duty = snap.data() as HouseholdDuty

      // Only the current claimer can release. Owner can also release
      // (e.g. to free a stuck claim if the caregiver went offline).
      const isCurrentClaimer = duty.claimedBy === callerUid
      const isOwner = duty.userId === callerUid
      if (!isCurrentClaimer && !isOwner) {
        return { ok: false as const, status: 403, error: 'Not the current claimer' }
      }

      // Nothing to release.
      if (!duty.claimedBy) {
        return { ok: true as const, status: 200, body: { status: 'already_unclaimed' } }
      }

      // Single-assigned duties keep their implicit claim (assignedTo[0]
      // is the perpetual claimer). Releasing one would leave the duty
      // in an inconsistent state where the sole assignee isn't claiming.
      // Reject so callers don't accidentally orphan single-assigned work.
      if (Array.isArray(duty.assignedTo) && duty.assignedTo.length <= 1) {
        return {
          ok: false as const,
          status: 400,
          error: 'Cannot release claim on a single-assigned duty (reassign or delete instead)',
        }
      }

      const now = new Date().toISOString()
      transaction.update(dutyRef, {
        claimedBy: null,
        claimedAt: null,
        lastModified: now,
        modifiedBy: callerUid,
      })
      return { ok: true as const, status: 200, body: { status: 'released' } }
    })

    if (!result.ok) {
      logger.info('Duty claim release rejected', { dutyId, callerUid, status: result.status, reason: result.error })
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    logger.info('Duty claim released', { dutyId, callerUid, status: result.body.status })
    return NextResponse.json(result.body, { status: 200 })
  } catch (error: any) {
    logger.error('[API /household-duties/[id]/claim DELETE] Error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
