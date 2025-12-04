'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getOrder } from '@/lib/shop-deliver-orders'
// import { ShopAndDeliverOrder } from '@/types/shopping'
type ShopAndDeliverOrder = any
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import PINDisplay from '@/components/delivery/PINDisplay'

const statusEmojis: Record<string, string> = {
  draft: '📝',
  submitted: '✅',
  assigned: '👤',
  shopping_started: '🛒',
  shopping_complete: '✔️',
  out_for_delivery: '🚗',
  delivered: '📦',
  cancelled: '❌',
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Order Submitted',
  assigned: 'Shopper Assigned',
  shopping_started: 'Shopping in Progress',
  shopping_complete: 'Shopping Complete',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<ShopAndDeliverOrder | null>(null)
  const orderId = params.orderId as string

  useEffect(() => {
    loadOrder()
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(loadOrder, 30000)
    return () => clearInterval(interval)
  }, [orderId, user])

  async function loadOrder() {
    if (!user) return

    try {
      const orderData = await getOrder(orderId)
      if (!orderData) {
        toast.error('Order not found')
        router.push('/shopping/orders')
        return
      }

      if (orderData.userId !== user.uid) {
        toast.error('Unauthorized')
        router.push('/shopping/orders')
        return
      }

      setOrder(orderData)
    } catch (error) {
      console.error('Error loading order:', error)
      toast.error('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-6xl mb-4">❌</p>
          <h1 className="text-2xl font-bold text-foreground mb-2">Order Not Found</h1>
          <Link
            href="/shopping/orders"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 mt-4"
          >
            View All Orders
          </Link>
        </div>
      </div>
    )
  }

  const subtotal = order.subtotalCents / 100
  const deliveryFee = order.deliveryFeeCents / 100
  const lateAddFees = order.lateAddFeesCents / 100
  const tax = order.taxCents / 100
  const total = order.totalCents / 100
  const refunded = (order.refundedCents || 0) / 100

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <div className="mb-6">
          <Link
            href="/shopping/orders"
            className="text-primary hover:underline inline-flex items-center gap-2 mb-4"
          >
            ← All Orders
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Order #{order.id.slice(0, 8)}</h1>
          <p className="text-muted-foreground">
            Placed {order.createdAt.toLocaleDateString()} at {order.createdAt.toLocaleTimeString()}
          </p>
        </div>

        {/* Status Timeline */}
        <div className="bg-card rounded-lg shadow-lg p-6 border mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Order Status</h2>

          <div className="flex items-center justify-between mb-6">
            <div className="text-center">
              <div className={`text-4xl mb-2 ${order.status === 'submitted' || order.status === 'assigned' || order.status === 'shopping_started' || order.status === 'shopping_complete' || order.status === 'out_for_delivery' || order.status === 'delivered' ? '' : 'opacity-30'}`}>
                {statusEmojis.submitted}
              </div>
              <p className="text-xs text-muted-foreground">Submitted</p>
            </div>

            <div className={`flex-1 h-1 mx-2 ${order.status === 'assigned' || order.status === 'shopping_started' || order.status === 'shopping_complete' || order.status === 'out_for_delivery' || order.status === 'delivered' ? 'bg-primary' : 'bg-border'}`}></div>

            <div className="text-center">
              <div className={`text-4xl mb-2 ${order.status === 'assigned' || order.status === 'shopping_started' || order.status === 'shopping_complete' || order.status === 'out_for_delivery' || order.status === 'delivered' ? '' : 'opacity-30'}`}>
                {statusEmojis.assigned}
              </div>
              <p className="text-xs text-muted-foreground">Assigned</p>
            </div>

            <div className={`flex-1 h-1 mx-2 ${order.status === 'shopping_started' || order.status === 'shopping_complete' || order.status === 'out_for_delivery' || order.status === 'delivered' ? 'bg-primary' : 'bg-border'}`}></div>

            <div className="text-center">
              <div className={`text-4xl mb-2 ${order.status === 'shopping_started' || order.status === 'shopping_complete' || order.status === 'out_for_delivery' || order.status === 'delivered' ? '' : 'opacity-30'}`}>
                {statusEmojis.shopping_started}
              </div>
              <p className="text-xs text-muted-foreground">Shopping</p>
            </div>

            <div className={`flex-1 h-1 mx-2 ${order.status === 'shopping_complete' || order.status === 'out_for_delivery' || order.status === 'delivered' ? 'bg-primary' : 'bg-border'}`}></div>

            <div className="text-center">
              <div className={`text-4xl mb-2 ${order.status === 'out_for_delivery' || order.status === 'delivered' ? '' : 'opacity-30'}`}>
                {statusEmojis.out_for_delivery}
              </div>
              <p className="text-xs text-muted-foreground">Delivery</p>
            </div>

            <div className={`flex-1 h-1 mx-2 ${order.status === 'delivered' ? 'bg-primary' : 'bg-border'}`}></div>

            <div className="text-center">
              <div className={`text-4xl mb-2 ${order.status === 'delivered' ? '' : 'opacity-30'}`}>
                {statusEmojis.delivered}
              </div>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-lg font-bold text-foreground">
              {statusEmojis[order.status]} {statusLabels[order.status]}
            </p>
          </div>
        </div>

        {/* Delivery PIN (shown when out for delivery) */}
        {(order.status === 'out_for_delivery' || order.status === 'delivered') && (
          <div className="bg-card rounded-lg shadow-lg p-6 border mb-6">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span>🔐</span>
              Delivery PIN
            </h2>
            <PINDisplay
              orderId={order.id}
              pin={order.deliveryPIN}
              userId={user?.uid || ''}
              orderStatus={order.status}
            />
          </div>
        )}

        {/* Delivery Details */}
        <div className="bg-card rounded-lg shadow-lg p-6 border mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <span>📍</span>
            Delivery Information
          </h2>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium text-foreground">{order.deliveryAddress}</p>
            </div>

            {order.deliveryWindow && (
              <div>
                <p className="text-sm text-muted-foreground">Delivery Window</p>
                <p className="font-medium text-foreground">
                  {order.deliveryWindow.start.toLocaleDateString()} <br/>
                  {order.deliveryWindow.start.toLocaleTimeString()} - {order.deliveryWindow.end.toLocaleTimeString()}
                </p>
              </div>
            )}

            {order.deliveryInstructions && (
              <div>
                <p className="text-sm text-muted-foreground">Instructions</p>
                <p className="font-medium text-foreground">{order.deliveryInstructions}</p>
              </div>
            )}

            {order.safetyNotes && (
              <div>
                <p className="text-sm text-muted-foreground">Safety Notes</p>
                <p className="font-medium text-foreground">{order.safetyNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-card rounded-lg shadow-lg p-6 border mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <span>💰</span>
            Order Total
          </h2>

          <div className="space-y-2">
            <div className="flex justify-between text-foreground">
              <span>Subtotal ({order.totalItems} items)</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {lateAddFees > 0 && (
              <div className="flex justify-between text-foreground">
                <span>Late Add Fees</span>
                <span>${lateAddFees.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-foreground">
              <span>Delivery Fee</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-foreground">
              <span>Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>

            {refunded > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Refunded</span>
                <span>-${refunded.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-lg font-bold text-foreground border-t border-border pt-2">
              <span>Total Charged</span>
              <span>${(total - refunded).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Post-Delivery Actions */}
        {order.status === 'delivered' && !order.inspectionCompleted && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
              <span>⚠️</span>
              Inspect Your Order
            </h2>
            <p className="text-muted-foreground mb-4">
              You have 24 hours to inspect your order and report any issues (missing, damaged, or wrong items).
            </p>
            <Link
              href={`/order/${order.id}/inspect`}
              className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Start Inspection
            </Link>
          </div>
        )}

        {order.inspectionCompleted && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
            <p className="text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
              <span>✅</span>
              Inspection completed on {order.inspectionCompletedAt?.toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Support Link */}
        <div className="text-center">
          <Link
            href="/support/customer"
            className="text-primary hover:underline inline-flex items-center gap-2"
          >
            Need help? Contact Support →
          </Link>
        </div>
      </div>
    </div>
  )
}
