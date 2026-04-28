import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { checkHouseholdAccess } from '@/lib/household-access'
import { logger } from '@/lib/logger'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/households/[householdId]/shopping
 *
 * Returns the household's shopping items for any caregiver in the household.
 *
 * Why this exists:
 *   The /shopping page + useShopping hook are hardcoded to "current user is
 *   the household" — they query shopping_items where userId == auth.uid.
 *   That works for solo accounts but fails when a caregiver (a different
 *   auth user, listed in `additionalCaregiverIds`) needs to view the
 *   household admin's shopping list to fulfill an assigned shopping duty.
 *
 *   Firestore rules block clients from reading another user's shopping_items
 *   directly. This server route does the RBAC check (caregiver must be in
 *   the household) and then uses admin SDK to read the household admin's
 *   items, returning them to the client.
 *
 * Auth: Bearer ID token (same as other authenticated routes).
 *
 * Response: { items, neededItems, ownerUserId }
 *   - items: all shopping_items belonging to the household admin
 *   - neededItems: subset where needed === true
 *   - ownerUserId: the household admin's userId (so the client knows whose
 *                  list it's seeing — useful for write operations later)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: householdId } = await params

    // Auth
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult) return unauthorizedResponse()
    const callerUserId = authResult.userId

    const db = getAdminDb()

    const access = await checkHouseholdAccess(householdId, callerUserId)
    if (!access.exists) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 })
    }
    if (!access.ownerUserId) {
      return NextResponse.json({ error: 'Household has no primary caregiver' }, { status: 422 })
    }
    if (!access.isMember) {
      logger.warn('[API /households/shopping] Caller not a household member', {
        callerUserId, householdId, ownerUserId: access.ownerUserId,
      })
      return NextResponse.json({ error: 'Not a member of this household' }, { status: 403 })
    }
    const ownerUserId = access.ownerUserId

    // The "household's" shopping list lives under the primary caregiver's
    // userId in the existing data model (shopping_items has a userId field).
    // If we ever migrate to a household-scoped collection, swap this for a
    // direct read on `household_shopping_items` or similar.
    const itemsSnap = await db
      .collection('shopping_items')
      .where('userId', '==', ownerUserId)
      .get()

    const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const neededItems = items.filter((it: any) => it.needed === true)

    return NextResponse.json({
      ownerUserId,
      items,
      neededItems,
      count: items.length,
      neededCount: neededItems.length,
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/households/[householdId]/shopping',
      operation: 'get',
    })
  }
}
