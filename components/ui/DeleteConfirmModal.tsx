/**
 * DeleteConfirmModal Component
 *
 * Consistent delete confirmation modal used platform-wide
 * Wrapper around ConfirmModal with delete-specific defaults
 */

'use client'

import ConfirmModal from './ConfirmModal'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  /** Name of the item being deleted (e.g., "this provider", "Barbara Rice") */
  itemName: string
  /** Type of item being deleted (e.g., "provider", "appointment", "patient") */
  itemType?: string
  /** Additional warning message */
  warningMessage?: string
  /** Whether this action is permanent/irreversible */
  isPermanent?: boolean
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'item',
  warningMessage,
  isPermanent = true
}: DeleteConfirmModalProps) {
  const title = `Delete ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}?`

  let message = `Are you sure you want to delete ${itemName}?`

  if (isPermanent) {
    message += '\n\nThis action cannot be undone.'
  }

  if (warningMessage) {
    message += `\n\n${warningMessage}`
  }

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
    />
  )
}
