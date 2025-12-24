'use client'

/**
 * BlockedOperationModal Component
 *
 * Displays when bulk operations are blocked due to:
 * 1. Insufficient permissions
 * 2. Active shopping session by another user
 *
 * Provides clear messaging and optional override path for owners
 */

import { useState } from 'react'
import type { BulkOperationPermissionCheck } from '@/lib/permissions-guard'
import type { HouseholdRole } from '@/types/household-permissions'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface BlockedOperationModalProps {
  isOpen: boolean
  permissionCheck: BulkOperationPermissionCheck
  onClose: () => void
  onOverride?: () => void
  allowOverride?: boolean
}

export function BlockedOperationModal({
  isOpen,
  permissionCheck,
  onClose,
  onOverride,
  allowOverride = false
}: BlockedOperationModalProps) {
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false)

  if (!isOpen) return null

  const isSessionBlock = permissionCheck.blockedBy?.type === 'active_session'
  const isPermissionBlock = permissionCheck.blockedBy?.type === 'permission'

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Active Session Block */}
          {isSessionBlock && (
            <>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🛒</div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Someone is Shopping
                </h2>
                <p className="text-muted-foreground mb-4">
                  <span className="font-semibold text-foreground">
                    {permissionCheck.blockedBy?.sessionOwner}
                  </span>{' '}
                  is currently at the store scanning items.
                </p>
                <p className="text-foreground">
                  Clearing the list now could disrupt their shopping session.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  Wait for {permissionCheck.blockedBy?.sessionOwner} to Finish
                </button>

                {allowOverride && onOverride && (
                  <button
                    type="button"
                    onClick={() => setShowOverrideConfirm(true)}
                    className="w-full px-4 py-3 border-2 border-red-500 text-red-600 dark:text-red-400 rounded-lg font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Override & Clear Anyway
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full px-4 py-3 border-2 border-border text-foreground rounded-lg font-semibold hover:bg-background transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* Permission Block */}
          {isPermissionBlock && (
            <>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🔒</div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Permission Required
                </h2>
                <p className="text-muted-foreground mb-4">
                  Only the household owner or primary caregiver can clear the entire shopping list.
                </p>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-yellow-900 dark:text-yellow-100">
                        Your role:
                      </span>
                      <span className="text-yellow-800 dark:text-yellow-200">
                        {getRoleName(permissionCheck.userRole)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-yellow-900 dark:text-yellow-100">
                        Required:
                      </span>
                      <span className="text-yellow-800 dark:text-yellow-200">
                        Owner or Primary Caregiver
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  💡 You can still add or remove individual items from the list.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Got It
              </button>
            </>
          )}
        </div>
      </div>

      {/* Override Confirmation Modal */}
      {showOverrideConfirm && isSessionBlock && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setShowOverrideConfirm(false)}
          onConfirm={() => {
            setShowOverrideConfirm(false)
            onClose()
            onOverride?.()
          }}
          title="Are You Sure?"
          message={`This will clear all items while ${permissionCheck.blockedBy?.sessionOwner} is shopping. They will be notified and may lose progress.`}
          confirmText="Yes, Clear List"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </>
  )
}

/**
 * Get user-friendly role name
 */
function getRoleName(role?: HouseholdRole | null): string {
  if (!role) return 'Unknown'

  switch (role) {
    case 'owner':
      return 'Owner'
    case 'primary_caregiver':
      return 'Primary Caregiver'
    case 'caregiver':
      return 'Caregiver'
    case 'viewer':
      return 'Viewer'
    default:
      return 'Unknown'
  }
}
