'use client'

/**
 * Order Inspection Component
 *
 * Post-delivery inspection interface for customers
 * Features:
 * - Checklist of all delivered items with photos
 * - 24-hour countdown timer
 * - Report issue button per item
 * - "All items received correctly" confirmation
 * - Visual status indicators
 */

import { useState, useEffect } from 'react'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
// import type { ShopAndDeliverOrder } from '@/types/shopping'
type ShopAndDeliverOrder = any
import { getRemainingInspectionTime, isWithinInspectionDeadline } from '@/lib/inspection-operations'

interface OrderInspectionProps {
  order: ShopAndDeliverOrder
  items: any[]
  onReportIssue: (itemId: string) => void
  onConfirmAllCorrect: () => Promise<void>
}

export function OrderInspection({
  order,
  items,
  onReportIssue,
  onConfirmAllCorrect
}: OrderInspectionProps) {
  const [remainingHours, setRemainingHours] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  // Update countdown timer
  useEffect(() => {
    if (!order.deliveredAt) return

    const deliveredAt = (order.deliveredAt as any)?.toDate
      ? (order.deliveredAt as any).toDate()
      : new Date(order.deliveredAt)

    const updateTimer = () => {
      const remaining = getRemainingInspectionTime(deliveredAt)
      setRemainingHours(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [order.deliveredAt])

  // Check if deadline has passed
  const deliveredAt = (order.deliveredAt as any)?.toDate
    ? (order.deliveredAt as any).toDate()
    : new Date(order.deliveredAt || new Date())

  const withinDeadline = isWithinInspectionDeadline(deliveredAt)

  // Get issues for each item
  const getItemIssues = (itemId: string) => {
    return order.reportedIssues?.filter((issue: any) => issue.itemId === itemId) || []
  }

  // Handle confirm all correct
  const handleConfirmAllCorrect = async () => {
    setLoading(true)
    try {
      await onConfirmAllCorrect()
    } catch (error) {
      console.error('[OrderInspection] Error confirming all correct:', error)
    } finally {
      setLoading(false)
    }
  }

  // Format remaining time
  const formatRemainingTime = () => {
    if (remainingHours <= 0) return 'Expired'

    const hours = Math.floor(remainingHours)
    const minutes = Math.floor((remainingHours - hours) * 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    }
    return `${minutes}m remaining`
  }

  // Get time color based on urgency
  const getTimeColor = () => {
    if (remainingHours <= 0) return 'text-error'
    if (remainingHours < 6) return 'text-warning'
    return 'text-success-light0'
  }

  return (
    <div className="space-y-6">
      {/* Header with Timer */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground dark:text-white">
            Inspect Your Order
          </h2>
          {order.inspectionCompleted ? (
            <div className="flex items-center gap-2 text-success-light0">
              <CheckCircleSolid className="h-6 w-6" />
              <span className="font-semibold">Inspection Complete</span>
            </div>
          ) : (
            <div className={`flex items-center gap-2 ${getTimeColor()}`}>
              <ClockIcon className="h-6 w-6" />
              <span className="font-semibold">{formatRemainingTime()}</span>
            </div>
          )}
        </div>

        {!withinDeadline && !order.inspectionCompleted && (
          <div className="bg-error-light dark:bg-red-900/20 border border-error rounded-lg p-4 flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-error flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-error mb-1">Inspection Deadline Passed</h3>
              <p className="text-sm text-error/80">
                The 24-hour inspection window has expired. You can no longer report issues with this order.
              </p>
            </div>
          </div>
        )}

        {withinDeadline && !order.inspectionCompleted && (
          <p className="text-muted-foreground">
            You have 24 hours from delivery to inspect your order and report any issues.
            Please check each item carefully and take photos of any problems.
          </p>
        )}
      </div>

      {/* Items Checklist */}
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted">
          <h3 className="font-semibold text-foreground dark:text-white">
            Delivered Items ({items.length})
          </h3>
        </div>

        <div className="divide-y divide-border">
          {items.map((item) => {
            const issues = getItemIssues(item.id)
            const hasIssues = issues.length > 0

            return (
              <div
                key={item.id}
                className={`p-4 hover:bg-muted/50 transition-colors ${
                  hasIssues ? 'bg-error-light/10 dark:bg-red-900/10' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Item Image */}
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <PhotoIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground dark:text-white mb-1">
                      {item.productName}
                    </h4>
                    {item.brand && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.brand}
                      </p>
                    )}

                    {/* Quantity and Price */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span>
                        Qty: {item.displayQuantity || `${item.quantity} ${item.unit || 'units'}`}
                      </span>
                      {item.scannedPriceCents && (
                        <span>
                          ${(item.scannedPriceCents / 100).toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Issues */}
                    {hasIssues && (
                      <div className="space-y-2 mb-3">
                        {issues.map((issue: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-error-light dark:bg-red-900/20 border border-error/30 rounded-lg p-3"
                          >
                            <div className="flex items-start gap-2">
                              <ExclamationTriangleIcon className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-error text-sm mb-1">
                                  {issue.issueType.replace(/_/g, ' ').toUpperCase()}
                                </p>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {issue.description}
                                </p>
                                {issue.resolution && (
                                  <p className="text-xs text-muted-foreground">
                                    Status: {issue.resolution.toUpperCase()}
                                    {issue.resolutionNotes && ` - ${issue.resolutionNotes}`}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Button */}
                    {withinDeadline && !order.inspectionCompleted && (
                      <button
                        onClick={() => onReportIssue(item.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          hasIssues
                            ? 'bg-muted text-foreground hover:bg-gray-200'
                            : 'bg-error text-white hover:bg-error-dark'
                        }`}
                      >
                        {hasIssues ? 'Report Another Issue' : 'Report Issue'}
                      </button>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {hasIssues ? (
                      <ExclamationTriangleIcon className="h-8 w-8 text-error" />
                    ) : (
                      <CheckCircleIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirmation Section */}
      {withinDeadline && !order.inspectionCompleted && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="text-center space-y-4">
            <CheckCircleSolid className="h-16 w-16 text-success-light0 mx-auto" />
            <h3 className="text-xl font-bold text-foreground dark:text-white">
              All Items Received Correctly?
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              If everything looks good and you have no issues to report, please confirm below to complete your inspection.
            </p>
            <button
              onClick={handleConfirmAllCorrect}
              disabled={loading}
              className="px-6 py-3 bg-success-light0 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Confirming...' : 'Confirm All Items Received Correctly'}
            </button>
          </div>
        </div>
      )}

      {/* Inspection Complete Message */}
      {order.inspectionCompleted && (
        <div className="bg-success-light dark:bg-green-900/20 border border-success-light0 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <CheckCircleSolid className="h-6 w-6 text-success-light0 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-success-light0 mb-2">
                Inspection Completed
              </h3>
              <p className="text-sm text-muted-foreground">
                Thank you for completing your order inspection.
                {order.reportedIssues && order.reportedIssues.length > 0
                  ? ' We are reviewing your reported issues and will process any refunds or replacements within 2-3 business days.'
                  : ' We appreciate your confirmation that everything was received correctly.'}
              </p>
              {order.inspectionCompletedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Completed on:{' '}
                  {new Date(
                    (order.inspectionCompletedAt as any)?.toDate
                      ? (order.inspectionCompletedAt as any).toDate()
                      : order.inspectionCompletedAt
                  ).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
