import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

/**
 * POST /api/shopping/confirm-purchases
 *
 * Confirm purchase of shopping items (like receiving a purchase order)
 * Updates items to inStock=true and records purchase metadata
 *
 * Body:
 * {
 *   itemIds: string[],        // Shopping item IDs to confirm
 *   store?: string,           // Optional: store name
 *   totalAmount?: number,     // Optional: receipt total
 *   purchaseDate?: string     // Optional: ISO date string, defaults to now
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Parse request body
    const body = await request.json()
    const { itemIds, store, totalAmount, purchaseDate } = body

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 })
    }

    // Validate purchase date
    const confirmedAt = purchaseDate ? new Date(purchaseDate) : new Date()
    if (isNaN(confirmedAt.getTime())) {
      return NextResponse.json({ error: 'Invalid purchaseDate format' }, { status: 400 })
    }

    logger.info('Confirming purchase request', {
      userId,
      itemCount: itemIds.length,
      itemIds: itemIds.slice(0, 5) // Log first 5 items
    })

    // Process each item
    const batch = adminDb.batch()
    const results: Array<{
      itemId: string
      success: boolean
      error?: string
    }> = []

    // Expiration days by category (days from purchase)
    const expirationDays: Record<string, number> = {
      produce: 7,
      meat: 5,
      seafood: 3,
      dairy: 14,
      bakery: 5,
      deli: 5,
      eggs: 30,
      herbs: 7,
      frozen: 180,
      pantry: 365,
      beverages: 90,
      condiments: 180,
      other: 30
    }

    for (const itemId of itemIds) {
      try {
        // Get the item from root shopping_items collection
        const itemRef = adminDb
          .collection('shopping_items')
          .doc(itemId)

        const itemDoc = await itemRef.get()

        if (!itemDoc.exists) {
          results.push({
            itemId,
            success: false,
            error: 'Item not found'
          })
          continue
        }

        const itemData = itemDoc.data()

        // Security: Verify the item belongs to this user
        if (itemData?.userId !== userId && itemData?.householdId !== userId) {
          logger.error('Purchase confirmation authorization failed', new Error('Unauthorized access'), {
            itemId,
            requestUserId: userId,
            itemUserId: itemData?.userId,
            itemHouseholdId: itemData?.householdId
          })
          results.push({
            itemId,
            success: false,
            error: 'Unauthorized - item does not belong to user'
          })
          continue
        }

        // Calculate expiration date based on category
        const categoryKey = itemData?.category || 'other'
        const daysToExpire = expirationDays[categoryKey] || 30
        const expiresAt = new Date(confirmedAt.getTime() + daysToExpire * 24 * 60 * 60 * 1000)

        // Create purchase history entry (only include defined fields)
        const purchaseEntry: any = {
          date: Timestamp.fromDate(confirmedAt),
          expiresAt: Timestamp.fromDate(expiresAt)
        }

        // Only add optional fields if they have values
        if (store) {
          purchaseEntry.store = store
        }

        // Update the item
        batch.update(itemRef, {
          inStock: true,
          needed: false,
          lastPurchased: Timestamp.fromDate(confirmedAt),
          expiresAt: Timestamp.fromDate(expiresAt),
          purchaseHistory: FieldValue.arrayUnion(purchaseEntry),
          updatedAt: Timestamp.now()
        })

        results.push({
          itemId,
          success: true
        })
      } catch (error) {
        logger.error('Error confirming purchase for item', error as Error, { itemId })
        results.push({
          itemId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Commit all updates
    try {
      await batch.commit()
    } catch (commitError) {
      logger.error('Failed to commit batch update', commitError as Error, {
        userId,
        itemCount: itemIds.length
      })

      // Mark all pending items as failed
      for (const result of results) {
        if (result.success) {
          result.success = false
          result.error = 'Batch commit failed'
        }
      }
    }

    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    logger.info('Purchase confirmation completed', {
      userId,
      store,
      totalAmount,
      successCount,
      failedCount
    })

    return NextResponse.json({
      success: true,
      message: `Confirmed purchase of ${successCount} item(s)`,
      summary: {
        total: itemIds.length,
        successful: successCount,
        failed: failedCount
      },
      results
    })
  } catch (error) {
    logger.error('Error confirming purchases', error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm purchases' },
      { status: 500 }
    )
  }
}
