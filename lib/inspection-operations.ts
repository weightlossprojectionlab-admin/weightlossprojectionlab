'use client'

/**
 * Order Inspection and Issue Reporting Operations
 *
 * Handles:
 * - Post-delivery inspection workflow
 * - Issue reporting with photo evidence
 * - Fraud detection based on customer patterns
 * - Automatic refund approval for low-risk claims
 */

import { logger } from '@/lib/logger'
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore'
import { db } from './firebase'
// import type { ShopAndDeliverOrder } from '@/types/shopping'
type ShopAndDeliverOrder = any
// import { FRAUD_THRESHOLDS } from '@/types/shopping'
const FRAUD_THRESHOLDS = { INSPECTION_DEADLINE_HOURS: 24, MAX_MISSING_ITEMS_PER_ORDER: 5, MAX_REFUND_RATE_PERCENT: 50, PIN_RETRY_LIMIT: 3 }
import { uploadBase64Image } from './storage-upload'

const ORDERS_COLLECTION = 'shop_and_deliver_orders'

// Auto-approval threshold for low-risk refunds
const AUTO_APPROVE_THRESHOLD_CENTS = 2000 // $20

/**
 * Start inspection process
 * Marks the inspection as started and records timestamp
 */
export async function startInspection(orderId: string): Promise<void> {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId)
    const orderDoc = await getDoc(orderRef)

    if (!orderDoc.exists()) {
      throw new Error('Order not found')
    }

    const order = orderDoc.data() as ShopAndDeliverOrder

    // Verify order is in delivered status
    if (order.status !== 'delivered') {
      throw new Error('Order must be delivered before inspection can start')
    }

    // Check if inspection deadline has passed (24 hours)
    const deliveredAt = order.deliveredAt as any
    const deliveryTime = deliveredAt?.toDate ? deliveredAt.toDate() : new Date(deliveredAt)
    const deadline = new Date(deliveryTime)
    deadline.setHours(deadline.getHours() + FRAUD_THRESHOLDS.INSPECTION_DEADLINE_HOURS)

    if (new Date() > deadline) {
      throw new Error('Inspection deadline has passed (24 hours)')
    }

    await updateDoc(orderRef, {
      updatedAt: Timestamp.now()
    })

    logger.info('[Inspection] Inspection started', { orderId })
  } catch (error) {
    logger.error('[Inspection] Error starting inspection', error as Error, { orderId })
    throw error
  }
}

/**
 * Report an issue with a delivered item
 * Requires photo evidence for all claims
 */
export async function reportIssue(
  orderId: string,
  itemId: string,
  issue: {
    issueType: 'missing' | 'damaged' | 'wrong_item' | 'expired' | 'quality_issue'
    description: string
    photoBase64: string // Required photo evidence
  }
): Promise<void> {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId)
    const orderDoc = await getDoc(orderRef)

    if (!orderDoc.exists()) {
      throw new Error('Order not found')
    }

    const order = orderDoc.data() as ShopAndDeliverOrder

    // Verify inspection deadline hasn't passed
    const deliveredAt = order.deliveredAt as any
    const deliveryTime = deliveredAt?.toDate ? deliveredAt.toDate() : new Date(deliveredAt)
    const deadline = new Date(deliveryTime)
    deadline.setHours(deadline.getHours() + FRAUD_THRESHOLDS.INSPECTION_DEADLINE_HOURS)

    if (new Date() > deadline) {
      throw new Error('Inspection deadline has passed (24 hours)')
    }

    // Upload photo evidence
    const photoUrl = await uploadBase64Image(
      issue.photoBase64,
      `orders/${orderId}/issues/${itemId}-${Date.now()}.jpg`
    )

    // Create issue report
    const reportedIssue = {
      itemId,
      issueType: issue.issueType,
      description: issue.description,
      photoUrl,
      reportedAt: new Date(),
      resolved: false,
      resolution: 'pending' as const,
      resolutionNotes: undefined
    }

    // Get existing issues or initialize empty array
    const existingIssues = order.reportedIssues || []
    const updatedIssues = [...existingIssues, reportedIssue]

    // Count issue types for fraud detection
    const missingItemsCount = updatedIssues.filter(i => i.issueType === 'missing').length
    const damagedItemsCount = updatedIssues.filter(i => i.issueType === 'damaged' || i.issueType === 'quality_issue').length

    // Check for suspicious patterns
    const fraudFlags = order.fraudFlags || []

    // Flag if too many missing items in single order
    if (missingItemsCount > FRAUD_THRESHOLDS.MAX_MISSING_ITEMS_PER_ORDER) {
      fraudFlags.push({
        type: 'multiple_missing_claims' as const,
        detectedAt: new Date(),
        severity: 'high' as const
      })
    }

    // Calculate fraud score for customer
    const customerFraudScore = await calculateFraudScore(order.userId)

    // Update order with new issue
    await updateDoc(orderRef, {
      reportedIssues: updatedIssues,
      missingItems: missingItemsCount,
      damagedItems: damagedItemsCount,
      fraudFlags: fraudFlags,
      customerFraudScore,
      requiresManualReview: customerFraudScore > 50 || fraudFlags.length > 0,
      updatedAt: Timestamp.now()
    })

    // Auto-approve refund if criteria met
    await autoApproveRefund(orderId, reportedIssue, order, customerFraudScore)

    logger.info('[Inspection] Issue reported', {
      orderId,
      itemId,
      issueType: issue.issueType,
      fraudScore: customerFraudScore
    })
  } catch (error) {
    logger.error('[Inspection] Error reporting issue', error as Error, { orderId, itemId })
    throw error
  }
}

/**
 * Complete inspection process
 * Marks inspection as complete, either with or without issues
 */
export async function completeInspection(
  orderId: string,
  allItemsCorrect: boolean = false
): Promise<void> {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId)
    const orderDoc = await getDoc(orderRef)

    if (!orderDoc.exists()) {
      throw new Error('Order not found')
    }

    const order = orderDoc.data() as ShopAndDeliverOrder

    // If customer confirmed all items correct, clear any existing fraud flags
    const updates: any = {
      inspectionCompleted: true,
      inspectionCompletedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    // If all items confirmed correct and no issues reported, it's a good signal
    if (allItemsCorrect && (!order.reportedIssues || order.reportedIssues.length === 0)) {
      // This is a positive signal - reduce fraud score slightly
      const currentScore = order.customerFraudScore || 0
      updates.customerFraudScore = Math.max(0, currentScore - 5)
    }

    // If inspection not completed, add fraud flag
    if (!allItemsCorrect && (!order.reportedIssues || order.reportedIssues.length === 0)) {
      // Customer didn't complete inspection properly
      const fraudFlags = order.fraudFlags || []
      fraudFlags.push({
        type: 'inspection_not_completed' as const,
        detectedAt: new Date(),
        severity: 'low' as const
      })
      updates.fraudFlags = fraudFlags
    }

    await updateDoc(orderRef, updates)

    logger.info('[Inspection] Inspection completed', {
      orderId,
      allItemsCorrect,
      issuesReported: order.reportedIssues?.length || 0
    })
  } catch (error) {
    logger.error('[Inspection] Error completing inspection', error as Error, { orderId })
    throw error
  }
}

/**
 * Calculate fraud score for a customer based on their order history
 * Returns a score from 0-100 (higher = more suspicious)
 */
export async function calculateFraudScore(userId: string): Promise<number> {
  try {
    // Get customer's order history
    const ordersQuery = query(
      collection(db, ORDERS_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'delivered'),
      orderBy('deliveredAt', 'desc'),
      firestoreLimit(20) // Look at last 20 orders
    )

    const ordersSnapshot = await getDocs(ordersQuery)

    if (ordersSnapshot.empty) {
      // New customer, low risk
      return 0
    }

    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ShopAndDeliverOrder[]

    let score = 0
    const totalOrders = orders.length

    // Count orders with refunds
    const ordersWithRefunds = orders.filter(o => (o.refundedCents || 0) > 0).length
    const refundRate = (ordersWithRefunds / totalOrders) * 100

    // High refund rate is suspicious
    if (refundRate > FRAUD_THRESHOLDS.MAX_REFUND_RATE_PERCENT) {
      score += 30
    } else if (refundRate > 10) {
      score += 15
    }

    // Count total missing item claims across all orders
    const totalMissingClaims = orders.reduce((sum, o) =>
      sum + (o.reportedIssues?.filter((i: any) => i.issueType === 'missing').length || 0), 0
    )

    // Multiple missing item claims across orders is very suspicious
    if (totalMissingClaims > 5) {
      score += 40
    } else if (totalMissingClaims > 2) {
      score += 20
    }

    // Count orders where PIN wasn't verified
    const ordersWithoutPIN = orders.filter(o => !o.deliveryPINVerified).length
    if (ordersWithoutPIN > 2) {
      score += 15
    }

    // Count incomplete inspections
    const incompleteInspections = orders.filter(o =>
      !o.inspectionCompleted &&
      o.deliveredAt &&
      new Date().getTime() - (o.deliveredAt as any).toDate().getTime() > 48 * 60 * 60 * 1000 // 48 hours
    ).length

    if (incompleteInspections > 3) {
      score += 10
    }

    // Recent order pattern - multiple issues in recent orders
    const recentOrders = orders.slice(0, 5)
    const recentOrdersWithIssues = recentOrders.filter(o =>
      (o.reportedIssues?.length || 0) > 0
    ).length

    if (recentOrdersWithIssues >= 3) {
      score += 25
    }

    // Cap score at 100
    return Math.min(100, score)
  } catch (error) {
    logger.error('[Inspection] Error calculating fraud score', error as Error, { userId })
    // Return moderate score on error to be safe
    return 30
  }
}

/**
 * Auto-approve refund for low-risk, low-value claims
 * Criteria:
 * - Item value < $20
 * - Customer fraud score < 30
 * - Photo evidence provided
 * - Not a missing item claim (those require manual review)
 */
async function autoApproveRefund(
  orderId: string,
  issue: any,
  order: ShopAndDeliverOrder,
  fraudScore: number
): Promise<void> {
  try {
    // Get item to check value
    const itemRef = doc(db, 'shopping_items', issue.itemId)
    const itemDoc = await getDoc(itemRef)

    if (!itemDoc.exists()) {
      logger.warn('[Inspection] Item not found for auto-approval', { itemId: issue.itemId })
      return
    }

    const item = itemDoc.data()
    const itemValueCents = item.scannedPriceCents || item.expectedPriceCents || 0

    // Check auto-approval criteria
    const canAutoApprove =
      itemValueCents < AUTO_APPROVE_THRESHOLD_CENTS &&
      fraudScore < 30 &&
      issue.issueType !== 'missing' && // Missing items need manual review
      issue.photoUrl // Photo evidence required

    if (!canAutoApprove) {
      logger.info('[Inspection] Issue requires manual review', {
        orderId,
        itemValueCents,
        fraudScore,
        issueType: issue.issueType
      })
      return
    }

    // Auto-approve refund
    const orderRef = doc(db, ORDERS_COLLECTION, orderId)
    const currentRefund = order.refundedCents || 0
    const newRefund = currentRefund + itemValueCents

    // Update issue resolution
    const updatedIssues = (order.reportedIssues || []).map((i: any) =>
      i.itemId === issue.itemId && i.reportedAt === issue.reportedAt
        ? {
            ...i,
            resolved: true,
            resolution: 'refund' as const,
            resolutionNotes: `Auto-approved refund: $${(itemValueCents / 100).toFixed(2)}`
          }
        : i
    )

    await updateDoc(orderRef, {
      reportedIssues: updatedIssues,
      refundedCents: newRefund,
      updatedAt: Timestamp.now()
    })

    logger.info('[Inspection] Refund auto-approved', {
      orderId,
      itemId: issue.itemId,
      refundAmount: itemValueCents,
      totalRefund: newRefund
    })
  } catch (error) {
    logger.error('[Inspection] Error auto-approving refund', error as Error, { orderId })
    // Don't throw - let issue go to manual review
  }
}

/**
 * Get order with inspection details
 */
export async function getOrderForInspection(orderId: string): Promise<ShopAndDeliverOrder | null> {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId)
    const orderDoc = await getDoc(orderRef)

    if (!orderDoc.exists()) {
      return null
    }

    return { id: orderDoc.id, ...orderDoc.data() } as ShopAndDeliverOrder
  } catch (error) {
    logger.error('[Inspection] Error getting order for inspection', error as Error, { orderId })
    return null
  }
}

/**
 * Get items for an order
 */
export async function getOrderItems(itemIds: string[]): Promise<any[]> {
  try {
    const items = await Promise.all(
      itemIds.map(async (itemId) => {
        const itemRef = doc(db, 'shopping_items', itemId)
        const itemDoc = await getDoc(itemRef)

        if (!itemDoc.exists()) {
          return null
        }

        return { id: itemDoc.id, ...itemDoc.data() }
      })
    )

    return items.filter(item => item !== null)
  } catch (error) {
    logger.error('[Inspection] Error getting order items', error as Error)
    return []
  }
}

/**
 * Check if inspection is still within deadline
 */
export function isWithinInspectionDeadline(deliveredAt: Date): boolean {
  const deadline = new Date(deliveredAt)
  deadline.setHours(deadline.getHours() + FRAUD_THRESHOLDS.INSPECTION_DEADLINE_HOURS)
  return new Date() <= deadline
}

/**
 * Get remaining inspection time in hours
 */
export function getRemainingInspectionTime(deliveredAt: Date): number {
  const deadline = new Date(deliveredAt)
  deadline.setHours(deadline.getHours() + FRAUD_THRESHOLDS.INSPECTION_DEADLINE_HOURS)
  const remaining = deadline.getTime() - new Date().getTime()
  return Math.max(0, remaining / (1000 * 60 * 60)) // Convert to hours
}
