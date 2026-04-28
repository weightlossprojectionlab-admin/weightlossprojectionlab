import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
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

    // Look up the household to (a) verify the caller is a member, and
    // (b) find the household admin (whose shopping_items we'll surface).
    const householdDoc = await db.collection('households').doc(householdId).get()
    if (!householdDoc.exists) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 })
    }
    const household = householdDoc.data() ?? {}
    const ownerUserId: string | undefined = household.primaryCaregiverId
    if (!ownerUserId) {
      return NextResponse.json({ error: 'Household has no primary caregiver' }, { status: 422 })
    }

    // Caller is a household member if any of:
    //   1. Direct: createdBy / primaryCaregiverId / additionalCaregiverIds
    //   2. Indirect: an accepted entry in family_members where the caller is
    //      the userId and the household owner is the accountUserId. The
    //      /admin "Caregivers" UI populates family_members, NOT the
    //      household's array — so a strict array check returned 403 even
    //      for caregivers the admin had explicitly added.
    let isMember =
      household.createdBy === callerUserId ||
      household.primaryCaregiverId === callerUserId ||
      (Array.isArray(household.additionalCaregiverIds) &&
        household.additionalCaregiverIds.includes(callerUserId))

    if (!isMember) {
      const familySnap = await db
        .collection('family_members')
        .where('userId', '==', callerUserId)
        .where('accountUserId', '==', ownerUserId)
        .where('status', '==', 'accepted')
        .limit(1)
        .get()
      if (!familySnap.empty) isMember = true
    }

    if (!isMember) {
      logger.warn('[API /households/shopping] Caller not a household member', {
        callerUserId, householdId, ownerUserId,
      })
      return NextResponse.json({ error: 'Not a member of this household' }, { status: 403 })
    }

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
