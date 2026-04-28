/**
 * POST /api/households/[id]/shopping/items/[itemId]/purchase
 *
 * Lets a caregiver mark a household-shared shopping item as purchased on
 * behalf of the household owner. Mirrors `markItemAsPurchased` in
 * lib/shopping-operations.ts (which is client-SDK only and keyed to
 * auth.currentUser, so caregivers can't call it directly for someone
 * else's list — Firestore rules block them).
 *
 * Auth: Bearer ID token. Caller must be a household member (see
 * checkHouseholdAccess for the membership rules — covers /admin caregivers).
 *
 * Body (all optional):
 *   { quantity?: number, unit?: string, store?: string, expiresAt?: ISO date }
 *
 * Effect: updates `shopping_items/{itemId}` belonging to the household
 * owner — sets `inStock: true`, `needed: false`, appends a purchaseHistory
 * entry tagged with the caller's uid so the audit trail shows WHO bought it
 * (which the owner-only path can't do).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { checkHouseholdAccess } from '@/lib/household-access'
import { logger } from '@/lib/logger'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'
import { Timestamp } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(
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
    const { quantity, unit, store, expiresAt } = body ?? {}

    const db = getAdminDb()
    const itemRef = db.collection('shopping_items').doc(itemId)
    const itemSnap = await itemRef.get()
    if (!itemSnap.exists) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    const item = itemSnap.data() ?? {}

    // Item must belong to this household's owner. Refuse if it's a
    // different user's list — prevents a caregiver in household A from
    // poking at items keyed to household B's owner.
    if (item.userId !== ownerUserId) {
      logger.warn('[API /households/shopping/purchase] item ownership mismatch', {
        callerUserId, householdId, itemId, itemOwner: item.userId, householdOwner: ownerUserId,
      })
      return NextResponse.json({ error: 'Item does not belong to this household' }, { status: 403 })
    }

    const now = Timestamp.now()
    const expiresAtTs = expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null

    // Append to purchaseHistory rather than overwriting — the existing
    // shape is an array of { date, expiresAt?, store?, price? }. Tag with
    // purchasedBy so the household admin can see WHICH caregiver bought
    // each item; the existing client-side `markItemAsPurchased` doesn't
    // record this because there it's always auth.currentUser.
    const newPurchase: Record<string, unknown> = {
      date: now,
      purchasedBy: callerUserId,
    }
    if (expiresAtTs) newPurchase.expiresAt = expiresAtTs
    if (typeof store === 'string' && store.trim()) newPurchase.store = store.trim()

    const existingHistory = Array.isArray(item.purchaseHistory) ? item.purchaseHistory : []

    const updates: Record<string, unknown> = {
      inStock: true,
      needed: false,
      lastPurchased: now,
      // Top-level field already in the shopping schema (types/shopping.ts).
      // Mirrors the most recent purchaseHistory[].purchasedBy so the
      // owner's /shopping page can render "Purchased by [name]" without
      // diving into the array.
      purchasedBy: callerUserId,
      lastModifiedBy: callerUserId,
      updatedAt: now,
      purchaseHistory: [...existingHistory, newPurchase],
    }
    if (typeof quantity === 'number' && quantity > 0) updates.quantity = quantity
    if (typeof unit === 'string' && unit.trim()) updates.unit = unit.trim()
    if (expiresAtTs) updates.expiresAt = expiresAtTs
    if (typeof store === 'string' && store.trim()) updates.preferredStore = store.trim()

    await itemRef.update(updates)

    logger.info('[API /households/shopping/purchase] Item marked purchased by caregiver', {
      itemId, householdId, callerUserId, ownerUserId,
    })

    return NextResponse.json({ success: true, itemId })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/households/[id]/shopping/items/[itemId]/purchase',
      operation: 'post',
    })
  }
}
