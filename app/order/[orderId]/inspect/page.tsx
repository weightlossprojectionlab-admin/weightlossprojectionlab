'use client'

/**
 * Order Inspection Page
 *
 * Full inspection UI for post-delivery order verification
 * Features:
 * - Complete order overview with all items
 * - Item photos from shopping trip
 * - Issue reporting workflow
 * - 24-hour countdown timer
 * - Completion confirmation
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { OrderInspection } from '@/components/delivery/OrderInspection'
import { ReportIssueModal } from '@/components/delivery/ReportIssueModal'
import {
  getOrderForInspection,
  getOrderItems,
  startInspection,
  reportIssue,
  completeInspection
} from '@/lib/inspection-operations'
// import type { ShopAndDeliverOrder } from '@/types/shopping'
type ShopAndDeliverOrder = any
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function OrderInspectionPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

  const orderId = params.orderId as string

  const [order, setOrder] = useState<ShopAndDeliverOrder | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Modal state
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  // Load order and items
  useEffect(() => {
    if (!user || !orderId) return

    const loadOrderData = async () => {
      try {
        setLoading(true)
        setError('')

        // Get order
        const orderData = await getOrderForInspection(orderId)

        if (!orderData) {
          setError('Order not found')
          return
        }

        // Verify user owns this order
        if (orderData.userId !== user.uid) {
          setError('You do not have permission to view this order')
          return
        }

        // Verify order is delivered
        if (orderData.status !== 'delivered') {
          setError('Order must be delivered before inspection')
          return
        }

        setOrder(orderData)

        // Get order items
        const itemsData = await getOrderItems(orderData.itemIds)
        setItems(itemsData)

        // Start inspection if not already started
        if (!orderData.inspectionCompleted) {
          await startInspection(orderId)
        }
      } catch (error: any) {
        console.error('[InspectionPage] Load error:', error)
        setError(error.message || 'Failed to load order')
      } finally {
        setLoading(false)
      }
    }

    loadOrderData()
  }, [user, orderId])

  // Handle report issue
  const handleReportIssue = (itemId: string) => {
    setSelectedItemId(itemId)
    setReportModalOpen(true)
  }

  // Handle submit issue report
  const handleSubmitIssue = async (issue: {
    issueType: 'missing' | 'damaged' | 'wrong_item' | 'expired' | 'quality_issue'
    description: string
    photoBase64: string
  }) => {
    if (!selectedItemId) return

    try {
      await reportIssue(orderId, selectedItemId, issue)

      toast.success('Issue reported successfully')

      // Reload order to get updated data
      const updatedOrder = await getOrderForInspection(orderId)
      if (updatedOrder) {
        setOrder(updatedOrder)
      }

      setReportModalOpen(false)
      setSelectedItemId(null)
    } catch (error: any) {
      console.error('[InspectionPage] Report issue error:', error)
      toast.error(error.message || 'Failed to report issue')
      throw error
    }
  }

  // Handle confirm all correct
  const handleConfirmAllCorrect = async () => {
    try {
      await completeInspection(orderId, true)

      toast.success('Inspection completed - all items confirmed correct')

      // Reload order
      const updatedOrder = await getOrderForInspection(orderId)
      if (updatedOrder) {
        setOrder(updatedOrder)
      }
    } catch (error: any) {
      console.error('[InspectionPage] Confirm error:', error)
      toast.error(error.message || 'Failed to complete inspection')
    }
  }

  // Get selected item for modal
  const selectedItem = items.find(item => item.id === selectedItemId)

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading order inspection...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-lg shadow-lg border border-border p-8 text-center">
          <div className="w-16 h-16 bg-error-light dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-error text-2xl">!</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground dark:text-white mb-2">
            Unable to Load Order
          </h2>
          <p className="text-muted-foreground mb-6">
            {error || 'Order not found'}
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeftIcon className="h-6 w-6 text-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground dark:text-white">
                Order Inspection
              </h1>
              <p className="text-sm text-muted-foreground">
                Order #{orderId.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Order Summary */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground dark:text-white mb-4">
            Order Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Items</p>
              <p className="text-2xl font-bold text-foreground dark:text-white">
                {order.totalItems}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Order Total</p>
              <p className="text-2xl font-bold text-foreground dark:text-white">
                ${(order.totalCents / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Delivered At</p>
              <p className="text-sm font-medium text-foreground dark:text-white">
                {order.deliveredAt &&
                  new Date(
                    (order.deliveredAt as any)?.toDate
                      ? (order.deliveredAt as any).toDate()
                      : order.deliveredAt
                  ).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Issues Reported</p>
              <p className="text-2xl font-bold text-foreground dark:text-white">
                {order.reportedIssues?.length || 0}
              </p>
            </div>
          </div>

          {/* Delivery Photo */}
          {order.deliveryPhotoUrl && (
            <div className="mt-6">
              <p className="text-sm font-medium text-foreground dark:text-white mb-2">
                Delivery Photo
              </p>
              <img
                src={order.deliveryPhotoUrl}
                alt="Delivery photo"
                className="w-full max-w-md h-64 object-cover rounded-lg border border-border"
              />
            </div>
          )}
        </div>

        {/* Inspection Interface */}
        <OrderInspection
          order={order}
          items={items}
          onReportIssue={handleReportIssue}
          onConfirmAllCorrect={handleConfirmAllCorrect}
        />

        {/* Fraud Detection Info (for high-risk customers) */}
        {order.requiresManualReview && (
          <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
              Additional Review Required
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Your reported issues will undergo additional verification before processing.
              This is a standard security measure. Refunds will be processed within 3-5 business days.
            </p>
          </div>
        )}

        {/* Refund Summary */}
        {order.refundedCents && order.refundedCents > 0 && (
          <div className="mt-6 bg-success-light dark:bg-green-900/20 border border-success-light0 rounded-lg p-6">
            <h3 className="font-semibold text-success-light0 mb-2">
              Refund Processed
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              A refund has been issued for the reported issues.
            </p>
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground dark:text-white">
                Total Refund:
              </span>
              <span className="text-2xl font-bold text-success-light0">
                ${(order.refundedCents / 100).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Report Issue Modal */}
      {selectedItem && (
        <ReportIssueModal
          isOpen={reportModalOpen}
          onClose={() => {
            setReportModalOpen(false)
            setSelectedItemId(null)
          }}
          item={selectedItem}
          onSubmit={handleSubmitIssue}
        />
      )}
    </div>
  )
}
