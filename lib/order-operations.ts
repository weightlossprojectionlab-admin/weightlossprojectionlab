/**
 * Order Operations - Shop & Deliver
 *
 * Handles order lifecycle, PIN verification, and fraud prevention
 */

// import {
//   ShopAndDeliverOrder,
//   ShopAndDeliverOrderStatus,
//   generateDeliveryPIN,
//   FRAUD_THRESHOLDS
// } from '@/types/shopping'
type ShopAndDeliverOrder = any
type ShopAndDeliverOrderStatus = string
const generateDeliveryPIN = () => Math.floor(1000 + Math.random() * 9000).toString()
const FRAUD_THRESHOLDS = { PIN_RETRY_LIMIT: 3 }
import { db } from '@/lib/firebase'
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore'

// PIN Attempt Tracking
interface PINAttempt {
  orderId: string
  enteredPIN: string
  success: boolean
  attemptedAt: Date
  attemptNumber: number
  driverId?: string
}

/**
 * Generate a new 4-digit delivery PIN
 * Uses the existing generateDeliveryPIN function from types
 */
export function generateOrderPIN(): string {
  return generateDeliveryPIN()
}

/**
 * Verify delivery PIN and track attempts
 * Returns success status and remaining attempts
 */
export async function verifyDeliveryPIN(
  orderId: string,
  enteredPIN: string,
  driverId?: string
): Promise<{
  success: boolean
  remainingAttempts: number
  message: string
  requiresCustomerCall: boolean
}> {
  try {
    // Get order from Firestore
    const orderRef = doc(db, 'shop_and_deliver_orders', orderId)
    const orderSnap = await getDoc(orderRef)

    if (!orderSnap.exists()) {
      return {
        success: false,
        remainingAttempts: 0,
        message: 'Order not found',
        requiresCustomerCall: true
      }
    }

    const order = orderSnap.data() as ShopAndDeliverOrder

    // Check if already verified
    if (order.deliveryPINVerified) {
      return {
        success: true,
        remainingAttempts: 3,
        message: 'Order already verified',
        requiresCustomerCall: false
      }
    }

    // Check if order is in correct status
    if (order.status !== 'out_for_delivery') {
      return {
        success: false,
        remainingAttempts: 0,
        message: 'Order is not out for delivery',
        requiresCustomerCall: true
      }
    }

    // Get current attempt count
    const attemptsRef = collection(db, 'shop_and_deliver_orders', orderId, 'pin_attempts')
    const attemptNumber = (order as any).pinAttempts || 0

    // Check if max attempts exceeded
    if (attemptNumber >= FRAUD_THRESHOLDS.PIN_RETRY_LIMIT) {
      return {
        success: false,
        remainingAttempts: 0,
        message: 'Maximum PIN attempts exceeded. Please call customer.',
        requiresCustomerCall: true
      }
    }

    // Verify PIN
    const isCorrect = enteredPIN === order.deliveryPIN

    // Log attempt
    await addDoc(attemptsRef, {
      enteredPIN: isCorrect ? enteredPIN : '****', // Don't store wrong PINs for security
      success: isCorrect,
      attemptedAt: serverTimestamp(),
      attemptNumber: attemptNumber + 1,
      driverId: driverId || order.driverId,
      timestamp: Timestamp.now()
    })

    // Update order
    const updateData: any = {
      pinAttempts: increment(1),
      updatedAt: serverTimestamp()
    }

    if (isCorrect) {
      updateData.deliveryPINVerified = true
      updateData.verifiedAt = serverTimestamp()
      updateData.status = 'delivered'
      updateData.deliveredAt = serverTimestamp()
    }

    await updateDoc(orderRef, updateData)

    const newAttemptCount = attemptNumber + 1
    const remainingAttempts = Math.max(0, FRAUD_THRESHOLDS.PIN_RETRY_LIMIT - newAttemptCount)

    if (isCorrect) {
      return {
        success: true,
        remainingAttempts: 3,
        message: 'Delivery verified successfully',
        requiresCustomerCall: false
      }
    } else {
      return {
        success: false,
        remainingAttempts,
        message: remainingAttempts > 0
          ? `Incorrect PIN. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
          : 'Maximum attempts reached. Please call customer.',
        requiresCustomerCall: remainingAttempts === 0
      }
    }
  } catch (error) {
    console.error('Error verifying PIN:', error)
    return {
      success: false,
      remainingAttempts: 0,
      message: 'Error verifying PIN. Please try again.',
      requiresCustomerCall: false
    }
  }
}

/**
 * Request PIN reset - generates new PIN
 * Should require customer verification or admin approval
 */
export async function requestPINReset(
  orderId: string,
  reason: string,
  requestedBy: string
): Promise<{
  success: boolean
  newPIN?: string
  message: string
}> {
  try {
    const orderRef = doc(db, 'shop_and_deliver_orders', orderId)
    const orderSnap = await getDoc(orderRef)

    if (!orderSnap.exists()) {
      return {
        success: false,
        message: 'Order not found'
      }
    }

    const order = orderSnap.data() as ShopAndDeliverOrder

    // Don't reset if already delivered
    if (order.status === 'delivered') {
      return {
        success: false,
        message: 'Cannot reset PIN for delivered order'
      }
    }

    // Generate new PIN
    const newPIN = generateOrderPIN()

    // Log the reset request
    await addDoc(collection(db, 'shop_and_deliver_orders', orderId, 'pin_resets'), {
      oldPIN: order.deliveryPIN,
      newPIN,
      reason,
      requestedBy,
      requestedAt: serverTimestamp(),
      timestamp: Timestamp.now()
    })

    // Update order with new PIN and reset attempts
    await updateDoc(orderRef, {
      deliveryPIN: newPIN,
      pinAttempts: 0,
      updatedAt: serverTimestamp()
    })

    return {
      success: true,
      newPIN,
      message: 'PIN reset successfully'
    }
  } catch (error) {
    console.error('Error resetting PIN:', error)
    return {
      success: false,
      message: 'Error resetting PIN. Please try again.'
    }
  }
}

/**
 * Get current PIN attempt count for an order
 */
export async function getPINAttemptCount(orderId: string): Promise<number> {
  try {
    const orderRef = doc(db, 'shop_and_deliver_orders', orderId)
    const orderSnap = await getDoc(orderRef)

    if (!orderSnap.exists()) {
      return 0
    }

    const order = orderSnap.data()
    return (order as any).pinAttempts || 0
  } catch (error) {
    console.error('Error getting PIN attempt count:', error)
    return 0
  }
}

/**
 * Create new order with PIN
 */
export async function createOrderWithPIN(
  userId: string,
  orderData: Partial<ShopAndDeliverOrder>
): Promise<{
  success: boolean
  orderId?: string
  pin?: string
  message: string
}> {
  try {
    const deliveryPIN = generateOrderPIN()

    const newOrder: Partial<ShopAndDeliverOrder> = {
      ...orderData,
      userId,
      deliveryPIN,
      deliveryPINVerified: false,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      pinAttempts: 0,
      inspectionCompleted: false,
      requiresManualReview: false,
      totalItems: 0,
      unavailableItems: 0,
      replacementsPending: 0,
      subtotalCents: 0,
      lateAddFeesCents: 0,
      deliveryFeeCents: 0,
      taxCents: 0,
      totalCents: 0,
      itemIds: []
    }

    const orderRef = await addDoc(
      collection(db, 'shop_and_deliver_orders'),
      {
        ...newOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    )

    return {
      success: true,
      orderId: orderRef.id,
      pin: deliveryPIN,
      message: 'Order created successfully'
    }
  } catch (error) {
    console.error('Error creating order:', error)
    return {
      success: false,
      message: 'Error creating order. Please try again.'
    }
  }
}

/**
 * Get order details including PIN (for customer view only)
 */
export async function getOrderWithPIN(
  orderId: string,
  userId: string
): Promise<{
  success: boolean
  order?: ShopAndDeliverOrder
  message: string
}> {
  try {
    const orderRef = doc(db, 'shop_and_deliver_orders', orderId)
    const orderSnap = await getDoc(orderRef)

    if (!orderSnap.exists()) {
      return {
        success: false,
        message: 'Order not found'
      }
    }

    const order = { id: orderSnap.id, ...orderSnap.data() } as ShopAndDeliverOrder

    // Verify user owns this order
    if (order.userId !== userId) {
      return {
        success: false,
        message: 'Unauthorized access to order'
      }
    }

    return {
      success: true,
      order,
      message: 'Order retrieved successfully'
    }
  } catch (error) {
    console.error('Error getting order:', error)
    return {
      success: false,
      message: 'Error retrieving order'
    }
  }
}
