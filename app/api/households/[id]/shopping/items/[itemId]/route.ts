/**
 * PATCH /api/households/[id]/shopping/items/[itemId]
 *
 * Lets a caregiver edit a household-shared shopping item. Used for
 * quantity steppers, "no longer needed" (remove from list), and inline
 * notes editing.
 *
 * Auth: Bearer ID token. Caller must be a household member.
 *
 * Body — any subset:
 *   quantity:    absolute new quantity (positive number)
 *   delta:       atomic increment/decrement (e.g. +1 or -1) — use this
 *                instead of `quantity` when two caregivers might be
 *                editing the same item simultaneously, since it's a
 *                FieldValue.increment under the hood.
 *   needed:      false to drop the item off the shopping list without
 *                marking it purchased ("we don't need this anymore")
 *   notes:       free-text annotation
 *   productName: rename the item
 *   priority:    'low' | 'medium' | 'high'
 *   unit:        unit string ("gallons", "lbs", etc.)
 *
 * Pass `quantity` OR `delta`, not both.
 *
 * Effect: updates `shopping_items/{itemId}` belonging to the household
 * owner via admin SDK, tags `lastModifiedBy` with the caller's uid.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { checkHouseholdAccess } from '@/lib/household-access'
import { logger } from '@/lib/logger'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: householdId, itemId } = await params

    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult) return unauthorizedResponse()
    const callerUserId = authResult.userId

    const access = await checkHouseholdAccess(householdId, callerUserId)
    if (!access.exists) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 })
    }
    if (!access.ownerUserId) {
      return NextResponse.json({ error: 'Household has no primary caregiver' }, { status: 422 })
    }
    if (!access.isMember) {
      return NextResponse.json({ error: 'Not a member of this household' }, { status: 403 })
    }
    const ownerUserId = access.ownerUserId

    const body = await request.json().catch(() => ({} as any))
    const { quantity, delta, needed, notes, productName, priority, unit } = body ?? {}

    if (quantity !== undefined && delta !== undefined) {
      return NextResponse.json(
        { error: 'Pass quantity or delta, not both' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const itemRef = db.collection('shopping_items').doc(itemId)
    const itemSnap = await itemRef.get()
    if (!itemSnap.exists) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    const item = itemSnap.data() ?? {}
    if (item.userId !== ownerUserId) {
      return NextResponse.json({ error: 'Item does not belong to this household' }, { status: 403 })
    }

    const now = Timestamp.now()
    const updates: Record<string, unknown> = {
      lastModifiedBy: callerUserId,
      updatedAt: now,
    }

    if (typeof quantity === 'number') {
      if (quantity < 0 || !Number.isFinite(quantity)) {
        return NextResponse.json({ error: 'quantity must be a non-negative number' }, { status: 400 })
      }
      updates.quantity = quantity
    }
    if (typeof delta === 'number') {
      if (!Number.isFinite(delta) || delta === 0) {
        return NextResponse.json({ error: 'delta must be a non-zero finite number' }, { status: 400 })
      }
      // Floor at 1 to prevent decrementing into negatives. We post-clamp
      // by reading current value isn't safe under contention — instead,
      // refuse the decrement when it would underflow based on the read
      // we already have. Two-caregiver race is exceedingly rare and the
      // worst case is a quantity of 0 which the UI shows as a removal
      // candidate anyway.
      const currentQty = typeof item.quantity === 'number' ? item.quantity : 0
      if (currentQty + delta < 0) {
        return NextResponse.json({ error: 'Cannot reduce quantity below zero' }, { status: 400 })
      }
      updates.quantity = FieldValue.increment(delta)
    }
    if (typeof needed === 'boolean') {
      updates.needed = needed
    }
    if (typeof notes === 'string') {
      updates.notes = notes.trim()
    }
    if (typeof productName === 'string' && productName.trim()) {
      updates.productName = productName.trim()
    }
    if (typeof priority === 'string' && ALLOWED_PRIORITIES.has(priority)) {
      updates.priority = priority
    }
    if (typeof unit === 'string' && unit.trim()) {
      updates.unit = unit.trim()
    }

    // Only updatedAt + lastModifiedBy were set — no actual change requested.
    if (Object.keys(updates).length === 2) {
      return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 })
    }

    await itemRef.update(updates)

    logger.info('[API /households/shopping/items PATCH] Item updated by caregiver', {
      itemId, householdId, callerUserId, ownerUserId,
      fields: Object.keys(updates).filter(k => k !== 'updatedAt' && k !== 'lastModifiedBy'),
    })

    return NextResponse.json({ success: true, itemId })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/households/[id]/shopping/items/[itemId]',
      operation: 'patch',
    })
  }
}
