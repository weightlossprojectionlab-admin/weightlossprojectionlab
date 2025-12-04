'use client'

/**
 * Delivery PIN Page - Customer View
 *
 * Shows customer their delivery PIN and order information
 * Features:
 * - Large PIN display
 * - Delivery instructions
 * - Driver contact info (when active)
 * - Order tracking status
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getOrderWithPIN } from '@/lib/order-operations'
// import { ShopAndDeliverOrder } from '@/types/shopping'
import PINDisplay from '@/components/delivery/PINDisplay'

// Temporary type until ShopAndDeliverOrder is properly exported
type ShopAndDeliverOrder = any

export default function DeliveryPINPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const orderId = params?.orderId as string

  const [order, setOrder] = useState<ShopAndDeliverOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!user || !orderId) return

    loadOrder()
  }, [user, orderId])

  const loadOrder = async () => {
    if (!user || !orderId) return

    setLoading(true)
    setError('')

    try {
      const result = await getOrderWithPIN(orderId, user.uid)

      if (result.success && result.order) {
        setOrder(result.order)
      } else {
        setError(result.message || 'Failed to load order')
      }
    } catch (err) {
      console.error('Error loading order:', err)
      setError('Error loading order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePINRefreshed = (newPIN: string) => {
    if (order) {
      setOrder({
        ...order,
        deliveryPIN: newPIN
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'shopping_complete':
      case 'shopping_started':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Order is being prepared'
      case 'submitted':
        return 'Order submitted - Waiting for shopper'
      case 'assigned':
        return 'Shopper assigned to your order'
      case 'shopping_started':
        return 'Shopper is currently shopping'
      case 'shopping_complete':
        return 'Shopping complete - Preparing for delivery'
      case 'out_for_delivery':
        return 'Driver is on the way!'
      case 'delivered':
        return 'Order delivered successfully'
      case 'cancelled':
        return 'Order cancelled'
      default:
        return status
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to view your order</p>
          <button
            onClick={() => router.push('/auth')}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading order...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 border-2 border-red-300 rounded-xl p-6">
          <div className="flex items-center gap-3 text-red-800 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">Error Loading Order</span>
          </div>
          <p className="text-red-700 mb-4">{error || 'Order not found'}</p>
          <button
            onClick={() => router.push('/shopping')}
            className="w-full py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
          >
            Back to Shopping
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Delivery Information
          </h1>
          <p className="text-gray-600">
            Order placed on {order.createdAt?.toLocaleString?.() || new Date(order.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Order Status */}
        <div className={`mb-8 p-4 rounded-xl border-2 ${getStatusColor(order.status)}`}>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {order.status === 'delivered' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : order.status === 'out_for_delivery' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {getStatusMessage(order.status)}
              </h3>
              {order.status === 'out_for_delivery' && order.deliveryWindow && (
                <p className="text-sm mt-1">
                  Expected: {new Date(order.deliveryWindow.start).toLocaleTimeString()} - {new Date(order.deliveryWindow.end).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* PIN Display */}
        {!order.deliveryPINVerified && (
          <div className="mb-8">
            <PINDisplay
              orderId={orderId}
              pin={order.deliveryPIN}
              userId={user.uid}
              orderStatus={order.status}
              onPINRefreshed={handlePINRefreshed}
            />
          </div>
        )}

        {/* Delivery Verified Message */}
        {order.deliveryPINVerified && (
          <div className="mb-8 bg-green-50 border-2 border-green-300 rounded-xl p-6">
            <div className="flex items-center gap-3 text-green-800 mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-bold text-xl">Delivery Verified!</h3>
                <p className="text-sm">
                  {order.verifiedAt && `Verified at ${new Date(order.verifiedAt).toLocaleString()}`}
                </p>
              </div>
            </div>
            <p className="text-green-700 mt-2">
              Please inspect your items and report any issues within 24 hours.
            </p>
          </div>
        )}

        {/* Delivery Address */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Delivery Address
          </h3>
          <p className="text-gray-700">{order.deliveryAddress}</p>
          {order.deliveryInstructions && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600 font-semibold mb-1">Instructions:</p>
              <p className="text-gray-700">{order.deliveryInstructions}</p>
            </div>
          )}
        </div>

        {/* Driver Contact Info */}
        {order.status === 'out_for_delivery' && order.driverId && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-6">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Your Driver
            </h3>
            <p className="text-blue-800 text-sm">
              Driver ID: {order.driverId.slice(0, 8)}...
            </p>
            {order.customerPhoneNumber && (
              <button
                onClick={() => window.location.href = `tel:${order.customerPhoneNumber}`}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Contact Driver
              </button>
            )}
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Items:</span>
              <span className="font-semibold">{order.totalItems}</span>
            </div>
            {order.unavailableItems > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Unavailable Items:</span>
                <span className="font-semibold text-red-600">{order.unavailableItems}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">${(order.subtotalCents / 100).toFixed(2)}</span>
            </div>
            {order.lateAddFeesCents > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Late Add Fees:</span>
                <span className="font-semibold">${(order.lateAddFeesCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Fee:</span>
              <span className="font-semibold">${(order.deliveryFeeCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax:</span>
              <span className="font-semibold">${(order.taxCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t-2 border-gray-300 text-lg">
              <span className="font-bold">Total:</span>
              <span className="font-bold text-green-600">${(order.totalCents / 100).toFixed(2)}</span>
            </div>
            {order.refundedCents && order.refundedCents > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Refunded:</span>
                <span className="font-semibold">-${(order.refundedCents / 100).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
