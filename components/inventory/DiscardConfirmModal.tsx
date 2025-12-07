'use client'

/**
 * Discard Confirmation Modal
 *
 * Confirms user intent before discarding inventory items
 * Allows selection of discard reason and notes
 * Supports both single and batch operations
 */

import { useState, useCallback } from 'react'
import { ShoppingItem } from '@/types/shopping'

interface DiscardConfirmModalProps {
  items: ShoppingItem[]
  isOpen: boolean
  onConfirm: (options: {
    addToShoppingList: boolean
    reason: 'expired' | 'spoiled' | 'moldy' | 'other'
    notes?: string
  }) => Promise<void>
  onCancel: () => void
}

export function DiscardConfirmModal({
  items,
  isOpen,
  onConfirm,
  onCancel
}: DiscardConfirmModalProps) {
  const [addToShoppingList, setAddToShoppingList] = useState(true)
  const [reason, setReason] = useState<'expired' | 'spoiled' | 'moldy' | 'other'>('expired')
  const [notes, setNotes] = useState('')
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = useCallback(async () => {
    setConfirming(true)
    try {
      await onConfirm({
        addToShoppingList,
        reason,
        notes: notes.trim() || undefined
      })
      // Reset form
      setAddToShoppingList(true)
      setReason('expired')
      setNotes('')
    } finally {
      setConfirming(false)
    }
  }, [addToShoppingList, reason, notes, onConfirm])

  if (!isOpen) return null

  const isBatch = items.length > 1

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Confirm Discard
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {isBatch
                  ? `You are about to discard ${items.length} items`
                  : `You are about to discard ${items[0]?.productName}`}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Items list (for batch operations) */}
          {isBatch && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Items to discard:
              </p>
              <div className="max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-1">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    {item.productName}
                    {item.quantity > 1 && (
                      <span className="text-xs text-gray-500">({item.quantity}x)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reason selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for discarding
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value as typeof reason)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
            >
              <option value="expired">Expired (past date)</option>
              <option value="spoiled">Spoiled (bad smell/taste)</option>
              <option value="moldy">Moldy (visible mold)</option>
              <option value="other">Other reason</option>
            </select>
          </div>

          {/* Notes (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any additional details..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent resize-none"
            />
          </div>

          {/* Add to shopping list option */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={addToShoppingList}
                onChange={e => setAddToShoppingList(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Add to shopping list
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isBatch
                    ? 'Automatically add these items back to your shopping list'
                    : 'Automatically add this item back to your shopping list'}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={confirming}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg flex items-center gap-2 disabled:cursor-not-allowed"
          >
            {confirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Discarding...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Confirm Discard
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
