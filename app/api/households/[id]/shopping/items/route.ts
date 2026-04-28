/**
 * POST /api/households/[id]/shopping/items
 *
 * Lets a caregiver add a manual item to the household's shopping list on
 * behalf of the household owner. Mirrors `addManualShoppingItem` in
 * lib/shopping-operations.ts (which is client-SDK + auth.currentUser
 * keyed, so caregivers can't write directly to another user's list).
 *
 * Auth: Bearer ID token. Caller must be a household member.
 *
 * Body:
 *   { productName: string, quantity?: number, unit?: string,
 *     priority?: 'low' | 'medium' | 'high', notes?: string }
 *
 * Effect: creates a new doc in `shopping_items` keyed to the household
 * owner's userId so it shows up on their /shopping page too. Tags
 * `addedBy` with the caller's uid so the audit trail shows which
 * caregiver added it.
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: householdId } = await params

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
    const productName = typeof body?.productName === 'string' ? body.productName.trim() : ''
    if (!productName) {
      return NextResponse.json({ error: 'productName is required' }, { status: 400 })
    }
    const quantity = typeof body?.quantity === 'number' && body.quantity > 0 ? body.quantity : 1
    const unit = typeof body?.unit === 'string' && body.unit.trim() ? body.unit.trim() : undefined
    const priority: 'low' | 'medium' | 'high' =
      body?.priority === 'low' || body?.priority === 'high' ? body.priority : 'medium'
    const notes = typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined

    const db = getAdminDb()
    const now = Timestamp.now()
    const ref = db.collection('shopping_items').doc()

    // Mirror the shape produced by addManualShoppingItem so the household
    // owner's existing /shopping page renders these without special-casing.
    const newItem: Record<string, unknown> = {
      userId: ownerUserId,
      productName,
      brand: '',
      imageUrl: '',
      category: 'other',
      isManual: true,
      manualIngredientName: productName,
      recipeIds: [],
      primaryRecipeId: null,
      inStock: false,
      quantity,
      needed: true,
      priority,
      isPerishable: false,
      purchaseHistory: [],
      addedBy: callerUserId,
      addedByCaregiver: callerUserId !== ownerUserId,
      source: 'caregiver',
      createdAt: now,
      updatedAt: now,
    }
    if (unit) newItem.unit = unit
    if (notes) newItem.notes = notes

    await ref.set(newItem)

    logger.info('[API /households/shopping/items POST] Item added by caregiver', {
      itemId: ref.id, householdId, callerUserId, ownerUserId,
    })

    return NextResponse.json({ success: true, itemId: ref.id }, { status: 201 })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/households/[id]/shopping/items',
      operation: 'post',
    })
  }
}
