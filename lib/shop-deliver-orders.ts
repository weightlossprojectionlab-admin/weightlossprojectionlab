/**
 * Shop & Deliver Order Management
 * Handles order creation, status updates, and customer charging
 */

import { db } from '@/lib/firebase'
import { collection, doc, setDoc, updateDoc, getDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore'
// import { ShopAndDeliverOrder, ShoppingItem, generateDeliveryPIN } from '@/types/shopping'
type ShopAndDeliverOrder = any
import { ShoppingItem } from '@/types/shopping'
const generateDeliveryPIN = () => Math.floor(1000 + Math.random() * 9000).toString()
import { createPaymentIntent, capturePaymentIntent } from './stripe-operations'

/**
 * Create a new shop-and-deliver order from shopping list
 */
export async function createShopAndDeliverOrder(params: {
  userId: string
  itemIds: string[] // ShoppingItem IDs
  deliveryAddress: string
  deliveryInstructions?: string
  safetyNotes?: string
  deliveryWindow?: {
    start: Date
    end: Date
  }
  customerPhoneNumber?: string
  paymentMethodId: string // Stripe payment method
}): Promise<{ orderId: string; order: ShopAndDeliverOrder }> {

  // Fetch all items
  const items: ShoppingItem[] = []
  for (const itemId of params.itemIds) {
    const itemDoc = await getDoc(doc(db, `users/${params.userId}/shopping_items/${itemId}`))
    if (itemDoc.exists()) {
      items.push({ id: itemDoc.id, ...itemDoc.data() } as ShoppingItem)
    }
  }

  if (items.length === 0) {
    throw new Error('No valid items found for order')
  }

  // Calculate estimated total
  const subtotalCents = items.reduce((sum, item) => {
    const estimatedPrice = item.expectedPriceCents || item.purchasePriceCents || 0
    return sum + (estimatedPrice * item.quantity)
  }, 0)

  const deliveryFeeCents = 700 // $7.00 delivery fee
  const taxRate = 0.08 // 8% tax (should be calculated based on zip code)
  const taxCents = Math.round(subtotalCents * taxRate)
  const estimatedTotalCents = subtotalCents + deliveryFeeCents + taxCents

  // Add 15% buffer for price variations
  const bufferCents = Math.round(estimatedTotalCents * 0.15)
  const holdAmountCents = estimatedTotalCents + bufferCents

  // Create Stripe Payment Intent (hold funds)
  const paymentIntent = await (createPaymentIntent as any)({
    customerId: params.userId,
    amountCents: holdAmountCents,
    paymentMethodId: params.paymentMethodId,
    metadata: {
      orderType: 'shop_and_deliver',
      estimatedTotal: estimatedTotalCents,
      buffer: bufferCents,
    }
  })

  // Generate delivery PIN
  const deliveryPIN = generateDeliveryPIN()

  // Create order document
  const orderId = doc(collection(db, 'shop_deliver_orders')).id
  const order: ShopAndDeliverOrder = {
    id: orderId,
    userId: params.userId,
    status: 'submitted',

    // Timestamps
    createdAt: new Date(),
    submittedAt: new Date(),

    // Items
    itemIds: params.itemIds,
    totalItems: items.length,
    unavailableItems: 0,
    replacementsPending: 0,

    // Pricing
    subtotalCents,
    lateAddFeesCents: 0,
    deliveryFeeCents,
    taxCents,
    totalCents: estimatedTotalCents,

    // Delivery Info
    deliveryAddress: params.deliveryAddress,
    deliveryInstructions: params.deliveryInstructions,
    safetyNotes: params.safetyNotes,
    deliveryWindow: params.deliveryWindow,
    customerPhoneNumber: params.customerPhoneNumber,

    // Delivery Verification
    deliveryPIN,
    deliveryPINVerified: false,

    // Inspection
    inspectionCompleted: false,

    // Fraud Prevention
    requiresManualReview: false,
    canCancel: true, // Can cancel until shopping starts

    updatedAt: new Date(),
  }

  // Save order to Firestore
  await setDoc(doc(db, `shop_deliver_orders/${orderId}`), {
    ...order,
    createdAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Mark items as part of this order
  for (const itemId of params.itemIds) {
    await updateDoc(doc(db, `users/${params.userId}/shopping_items/${itemId}`), {
      needed: false, // Remove from shopping list
      updatedAt: serverTimestamp(),
    })
  }

  return { orderId, order }
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<ShopAndDeliverOrder | null> {
  const orderDoc = await getDoc(doc(db, `shop_deliver_orders/${orderId}`))

  if (!orderDoc.exists()) {
    return null
  }

  const data = orderDoc.data()
  return {
    id: orderDoc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    submittedAt: data.submittedAt?.toDate(),
    assignedAt: data.assignedAt?.toDate(),
    shoppingStartedAt: data.shoppingStartedAt?.toDate(),
    shoppingCompletedAt: data.shoppingCompletedAt?.toDate(),
    outForDeliveryAt: data.outForDeliveryAt?.toDate(),
    deliveredAt: data.deliveredAt?.toDate(),
    verifiedAt: data.verifiedAt?.toDate(),
    inspectionCompletedAt: data.inspectionCompletedAt?.toDate(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    deliveryWindow: data.deliveryWindow ? {
      start: data.deliveryWindow.start?.toDate() || new Date(),
      end: data.deliveryWindow.end?.toDate() || new Date(),
    } : undefined,
  } as ShopAndDeliverOrder
}

/**
 * Get all orders for a user
 */
export async function getUserOrders(userId: string): Promise<ShopAndDeliverOrder[]> {
  const q = query(
    collection(db, 'shop_deliver_orders'),
    where('userId', '==', userId)
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      submittedAt: data.submittedAt?.toDate(),
      assignedAt: data.assignedAt?.toDate(),
      shoppingStartedAt: data.shoppingStartedAt?.toDate(),
      shoppingCompletedAt: data.shoppingCompletedAt?.toDate(),
      outForDeliveryAt: data.outForDeliveryAt?.toDate(),
      deliveredAt: data.deliveredAt?.toDate(),
      verifiedAt: data.verifiedAt?.toDate(),
      inspectionCompletedAt: data.inspectionCompletedAt?.toDate(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      deliveryWindow: data.deliveryWindow ? {
        start: data.deliveryWindow.start?.toDate() || new Date(),
        end: data.deliveryWindow.end?.toDate() || new Date(),
      } : undefined,
    } as ShopAndDeliverOrder
  })
}

/**
 * Add delivery instructions to an existing order
 */
export async function updateDeliveryInstructions(
  orderId: string,
  deliveryInstructions: string,
  safetyNotes?: string
): Promise<void> {
  await updateDoc(doc(db, `shop_deliver_orders/${orderId}`), {
    deliveryInstructions,
    safetyNotes,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Capture payment after shopping complete (called by shopper app)
 */
export async function captureOrderPayment(
  orderId: string,
  actualTotalCents: number
): Promise<void> {
  const order = await getOrder(orderId)
  if (!order) {
    throw new Error('Order not found')
  }

  if (order.status !== 'shopping_complete') {
    throw new Error('Cannot capture payment - order is not shopping_complete')
  }

  // Capture the actual amount charged
  await (capturePaymentIntent as any)({
    paymentIntentId: orderId, // We use orderId as paymentIntentId
    amountCents: actualTotalCents,
  })

  // Update order with final total
  await updateDoc(doc(db, `shop_deliver_orders/${orderId}`), {
    totalCents: actualTotalCents,
    updatedAt: serverTimestamp(),
  })
}
