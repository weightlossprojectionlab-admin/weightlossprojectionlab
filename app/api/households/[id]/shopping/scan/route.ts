/**
 * POST /api/households/[id]/shopping/scan
 *
 * Caregiver scans a barcode in the grocery aisle. Server resolves the
 * barcode against OpenFoodFacts and either:
 *   - matches an existing needed item on the household's list and marks
 *     it purchased (action: 'purchase' — the common path: caregiver
 *     scans the milk that's already on the shopping list)
 *   - adds a new item to the list as needed (action: 'add' — caregiver
 *     scans something they want to remember to buy)
 *   - adds a new item as already-purchased / in-stock (action: 'instock'
 *     — caregiver bought something not on the list and wants it logged)
 *
 * Default action when omitted: 'purchase' if a needed item with this
 * barcode exists for the household owner, otherwise 'instock' (we
 * assume the scan happened in the act of buying).
 *
 * Auth: Bearer ID token. Caller must be a household member.
 *
 * Body:
 *   { barcode: string, action?: 'purchase' | 'add' | 'instock' }
 *
 * Response:
 *   {
 *     success: true,
 *     action: 'purchase' | 'add' | 'instock',
 *     itemId: string,
 *     productName: string,
 *     matched: boolean   // true if we found an existing barcode match
 *   }
 *
 * Note on OpenFoodFacts: it's a public no-auth API; we hit it directly
 * from this server route. If the lookup fails (network / 404 / barcode
 * not in their DB) we still create the item with the barcode as the
 * name placeholder — the caregiver can rename via PATCH.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { checkHouseholdAccess } from '@/lib/household-access'
import { logger } from '@/lib/logger'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'
import { Timestamp } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

interface OpenFoodFactsLookup {
  productName?: string
  brand?: string
  imageUrl?: string
  category?: string
}

async function lookupBarcodeServer(barcode: string): Promise<OpenFoodFactsLookup | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      {
        headers: { 'User-Agent': 'WeightLossProjectLab/1.0 (server)' },
        // OpenFoodFacts caches well; let Next pass through but don't
        // block the request forever.
        signal: AbortSignal.timeout(5000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data?.status !== 1 || !data?.product) return null
    const p = data.product
    return {
      productName: p.product_name || undefined,
      brand: p.brands || undefined,
      imageUrl: p.image_front_url || p.image_url || undefined,
      category: typeof p.categories === 'string'
        ? p.categories.split(',').map((c: string) => c.trim()).filter(Boolean)[0]
        : undefined,
    }
  } catch (err) {
    logger.warn('[API /households/shopping/scan] OpenFoodFacts lookup failed', {
      barcode, error: (err as Error)?.message,
    })
    return null
  }
}

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
    const barcode = typeof body?.barcode === 'string' ? body.barcode.trim() : ''
    if (!barcode) {
      return NextResponse.json({ error: 'barcode is required' }, { status: 400 })
    }
    const requestedAction: string | undefined = body?.action
    if (
      requestedAction !== undefined &&
      requestedAction !== 'purchase' &&
      requestedAction !== 'add' &&
      requestedAction !== 'instock'
    ) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }

    const db = getAdminDb()

    // 1. Look for an existing item on the owner's list with this barcode.
    //    Don't filter by `needed` — if there's an in-stock duplicate we
    //    still want to update its purchase history rather than create a
    //    second doc for the same product.
    const existingSnap = await db
      .collection('shopping_items')
      .where('userId', '==', ownerUserId)
      .where('barcode', '==', barcode)
      .limit(1)
      .get()

    const matched = !existingSnap.empty
    const existing = matched ? existingSnap.docs[0] : null

    // Decide action: explicit override wins, otherwise infer.
    const action: 'purchase' | 'add' | 'instock' =
      (requestedAction as any) ?? (matched ? 'purchase' : 'instock')

    const now = Timestamp.now()

    if (existing && (action === 'purchase' || action === 'instock')) {
      // Update existing item — mark purchased.
      const data = existing.data()
      const history = Array.isArray(data.purchaseHistory) ? data.purchaseHistory : []
      await existing.ref.update({
        inStock: true,
        needed: false,
        lastPurchased: now,
        purchasedBy: callerUserId,
        lastModifiedBy: callerUserId,
        updatedAt: now,
        purchaseHistory: [
          ...history,
          { date: now, purchasedBy: callerUserId, scanned: true },
        ],
      })
      logger.info('[API /households/shopping/scan] Existing item marked purchased via scan', {
        itemId: existing.id, householdId, callerUserId, ownerUserId, barcode,
      })
      return NextResponse.json({
        success: true,
        action,
        itemId: existing.id,
        productName: data.productName ?? barcode,
        matched: true,
      })
    }

    if (existing && action === 'add') {
      // Existing item exists; just flag it as needed again. No new doc.
      const data = existing.data()
      await existing.ref.update({
        needed: true,
        lastModifiedBy: callerUserId,
        updatedAt: now,
      })
      return NextResponse.json({
        success: true,
        action: 'add',
        itemId: existing.id,
        productName: data.productName ?? barcode,
        matched: true,
      })
    }

    // No existing item — look up barcode and create a new one.
    const product = await lookupBarcodeServer(barcode)
    const ref = db.collection('shopping_items').doc()

    const productName = product?.productName || `Item ${barcode}`
    const newItem: Record<string, unknown> = {
      userId: ownerUserId,
      barcode,
      productName,
      brand: product?.brand ?? '',
      imageUrl: product?.imageUrl ?? '',
      category: product?.category ?? 'other',
      isManual: false,
      manualIngredientName: null,
      recipeIds: [],
      primaryRecipeId: null,
      quantity: 1,
      isPerishable: false,
      priority: 'medium',
      // addedBy is array-shaped per types/shopping.ts.
      addedBy: [callerUserId],
      addedByCaregiver: callerUserId !== ownerUserId,
      source: 'caregiver-scan',
      createdAt: now,
      updatedAt: now,
    }
    if (action === 'add') {
      newItem.needed = true
      newItem.inStock = false
      newItem.purchaseHistory = []
    } else {
      // 'instock' or default-instock
      newItem.needed = false
      newItem.inStock = true
      newItem.lastPurchased = now
      newItem.lastPurchasedBy = callerUserId
      newItem.purchaseHistory = [
        { date: now, purchasedBy: callerUserId, scanned: true },
      ]
    }

    await ref.set(newItem)
    logger.info('[API /households/shopping/scan] New item created via scan', {
      itemId: ref.id, householdId, callerUserId, ownerUserId, barcode,
      productMatched: !!product, action,
    })

    return NextResponse.json({
      success: true,
      action,
      itemId: ref.id,
      productName,
      matched: false,
    }, { status: 201 })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/households/[id]/shopping/scan',
      operation: 'post',
    })
  }
}
