'use client'

/**
 * Expired Items Cleanup Page
 *
 * Allows users to review and discard expired inventory items
 * Provides bulk selection and discard actions with confirmation
 * Uses real-time sync for multi-user households
 */

import { useState, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { useRealtimeExpiredItems } from '@/hooks/useRealtimeExpiredItems'
import { ExpiredItemsCleanupList } from '@/components/inventory/ExpiredItemsCleanupList'
import { DiscardConfirmModal } from '@/components/inventory/DiscardConfirmModal'
import { batchDiscardItems } from '@/lib/shopping-operations'
import { Spinner } from '@/components/ui/Spinner'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { BlockedOperationModal } from '@/components/shopping/BlockedOperationModal'
import { BulkOperationBlockedError } from '@/lib/permissions-guard'
import type { BulkOperationPermissionCheck } from '@/lib/permissions-guard'

function CleanupContent() {
  const router = useRouter()
  const {
    expiredItems,
    criticalItems,
    highRiskItems,
    mediumRiskItems,
    lowRiskItems,
    totalExpired,
    loading,
    getSummary
  } = useRealtimeExpiredItems()

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [blockedReason, setBlockedReason] = useState<BulkOperationPermissionCheck | null>(null)

  /**
   * Handle discard with confirmation modal
   */
  const handleDiscardRequest = useCallback(async (itemIds: string[], addToShoppingList: boolean) => {
    setSelectedItemIds(itemIds)
    setShowConfirmModal(true)
  }, [])

  /**
   * Execute discard after confirmation
   */
  const handleConfirmDiscard = useCallback(
    async (options: {
      addToShoppingList: boolean
      reason: 'expired' | 'spoiled' | 'moldy' | 'other'
      notes?: string
    }) => {
      const userId = auth.currentUser?.uid
      if (!userId) {
        toast.error('You must be logged in')
        return
      }

      if (selectedItemIds.length === 0) {
        toast.error('No items selected')
        return
      }

      try {
        toast.loading('Discarding items...', { id: 'discard' })

        const result = await batchDiscardItems(selectedItemIds, userId, {
          addToShoppingList: options.addToShoppingList,
          reason: options.reason,
          householdId: userId
        })

        if (result.failed.length > 0) {
          logger.warn('[Cleanup] Some items failed to discard', { failed: result.failed })
          toast.error(
            `${result.succeeded.length} items discarded, ${result.failed.length} failed`,
            { id: 'discard' }
          )
        } else {
          toast.success(
            `${result.succeeded.length} item${result.succeeded.length === 1 ? '' : 's'} discarded`,
            { id: 'discard' }
          )
        }

        // Close modal and clear selection
        setShowConfirmModal(false)
        setSelectedItemIds([])

        // If all items cleaned up, go back to inventory
        if (totalExpired - result.succeeded.length === 0) {
          setTimeout(() => {
            router.push('/inventory')
          }, 1000)
        }
      } catch (error) {
        // Handle blocked operation specifically
        if (error instanceof BulkOperationBlockedError) {
          setBlockedReason(error.permissionCheck)
          setShowBlockedModal(true)
          setShowConfirmModal(false)
          toast.dismiss('discard')
        } else {
          logger.error('[Cleanup] Discard error', error as Error)
          toast.error('Failed to discard items', { id: 'discard' })
        }
      }
    },
    [selectedItemIds, totalExpired, router]
  )

  const summary = getSummary()

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Cleanup Expired Items"
          subtitle={
            totalExpired > 0
              ? `${totalExpired} expired item${totalExpired === 1 ? '' : 's'} • ${summary.needsImmediateAttention} need${summary.needsImmediateAttention === 1 ? 's' : ''} immediate attention`
              : 'No expired items'
          }
        />

        <main className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Info Card */}
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              How to use this page
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Review expired items organized by risk level (critical to low)</li>
              <li>• Select items to discard or select entire categories</li>
              <li>• Choose to automatically add discarded items to your shopping list</li>
              <li>• Changes sync in real-time across all household members</li>
            </ul>
          </div>

          {/* Summary Stats */}
          {totalExpired > 0 && (
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {summary.critical}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">Critical</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {summary.high}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400">High Risk</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {summary.medium}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">Medium Risk</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {summary.low}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Low Risk</div>
              </div>
            </div>
          )}

          {/* Cleanup List */}
          <ExpiredItemsCleanupList
            expiredItems={expiredItems}
            criticalItems={criticalItems}
            highRiskItems={highRiskItems}
            mediumRiskItems={mediumRiskItems}
            lowRiskItems={lowRiskItems}
            onDiscardSelected={handleDiscardRequest}
            loading={loading}
          />

          {/* Confirm Modal */}
          <DiscardConfirmModal
            items={expiredItems.filter(item => selectedItemIds.includes(item.id))}
            isOpen={showConfirmModal}
            onConfirm={handleConfirmDiscard}
            onCancel={() => {
              setShowConfirmModal(false)
              setSelectedItemIds([])
            }}
          />

          {/* Blocked Operation Modal */}
          {blockedReason && (
            <BlockedOperationModal
              isOpen={showBlockedModal}
              permissionCheck={blockedReason}
              onClose={() => {
                setShowBlockedModal(false)
                setBlockedReason(null)
              }}
              allowOverride={false}
            />
          )}
        </main>
      </div>
    </AuthGuard>
  )
}

export default function CleanupPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CleanupContent />
    </Suspense>
  )
}
