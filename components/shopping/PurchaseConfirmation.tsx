'use client'

/**
 * Purchase Confirmation Component
 *
 * Allows users to explicitly confirm purchases (like receiving a purchase order).
 * Shows pending items that are needed but not yet in stock.
 * Users can select multiple items and confirm them in batch.
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import { ShoppingItem } from '@/types/shopping'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import {
  CheckCircleIcon,
  ShoppingCartIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface PurchaseConfirmationProps {
  pendingItems: ShoppingItem[]
  onConfirm: () => void // Callback to refresh the shopping list
}

export function PurchaseConfirmation({ pendingItems, onConfirm }: PurchaseConfirmationProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [store, setStore] = useState('')

  // If no pending items, don't show anything
  if (pendingItems.length === 0) {
    return null
  }

  const handleToggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === pendingItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(pendingItems.map(item => item.id)))
    }
  }

  const handleConfirmPurchases = async () => {
    if (selectedItems.size === 0) {
      toast.error('Please select at least one item')
      return
    }

    const user = auth.currentUser
    if (!user) {
      toast.error('Please sign in to confirm purchases')
      return
    }

    setConfirming(true)
    try {
      const idToken = await user.getIdToken()

      const response = await fetch('/api/shopping/confirm-purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          itemIds: Array.from(selectedItems),
          store: store || undefined,
          purchaseDate: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to confirm purchases')
      }

      const result = await response.json()

      toast.success(`✓ Confirmed ${result.summary.successful} item(s)!`)

      if (result.summary.failed > 0) {
        toast.error(`⚠️ ${result.summary.failed} item(s) failed to confirm`)
      }

      // Reset state
      setSelectedItems(new Set())
      setStore('')

      // Refresh the shopping list
      onConfirm()
    } catch (error) {
      logger.error('Error confirming purchases', error as Error)
      toast.error('Failed to confirm purchases')
    } finally {
      setConfirming(false)
    }
  }

  const selectedCount = selectedItems.size
  const allSelected = selectedCount === pendingItems.length

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ShoppingCartIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Confirm Purchases
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {pendingItems.length} item{pendingItems.length !== 1 ? 's' : ''} pending confirmation
            </p>
          </div>
        </div>

        {selectedCount > 0 && (
          <button
            onClick={() => setSelectedItems(new Set())}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Optional Store Input */}
      <div className="mb-4">
        <label htmlFor="store-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Store Name (Optional)
        </label>
        <input
          id="store-input"
          type="text"
          value={store}
          onChange={(e) => setStore(e.target.value)}
          placeholder="e.g., Walmart, Target, Whole Foods..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Select All Checkbox */}
      <div className="flex items-center mb-3 pb-3 border-b border-blue-200 dark:border-blue-800">
        <label className="flex items-center gap-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 p-2 rounded-lg transition-colors w-full">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Select All ({pendingItems.length})
          </span>
        </label>
      </div>

      {/* Item List */}
      <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
        {pendingItems.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-all"
          >
            <input
              type="checkbox"
              checked={selectedItems.has(item.id)}
              onChange={() => handleToggleItem(item.id)}
              className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 flex-shrink-0"
            />

            {/* Product Image */}
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.productName}
                className="w-12 h-12 object-cover rounded flex-shrink-0"
              />
            )}

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {item.productName}
              </div>
              {item.brand && (
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {item.brand}
                </div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {item.displayQuantity || `${item.quantity} ${item.unit || 'item'}`}
              </div>
            </div>

            {/* Category Badge */}
            <div className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded capitalize flex-shrink-0">
              {item.category}
            </div>
          </label>
        ))}
      </div>

      {/* Confirm Button */}
      <button
        onClick={handleConfirmPurchases}
        disabled={selectedCount === 0 || confirming}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        {confirming ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Confirming...</span>
          </>
        ) : (
          <>
            <CheckCircleIcon className="w-5 h-5" />
            <span>
              Confirm Purchase {selectedCount > 0 ? `(${selectedCount})` : ''}
            </span>
          </>
        )}
      </button>

      {/* Help Text */}
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 text-center">
        Confirming items will mark them as in stock and calculate expiration dates
      </p>
    </div>
  )
}
