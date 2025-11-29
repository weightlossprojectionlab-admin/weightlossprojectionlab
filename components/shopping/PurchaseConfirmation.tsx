'use client'

/**
 * Purchase Confirmation Component
 *
 * Allows users to explicitly confirm purchases (like receiving a purchase order).
 * Shows pending items that are needed but not yet in stock.
 * Users can select multiple items and confirm them in batch.
 */

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { ShoppingItem } from '@/types/shopping'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { medicalOperations } from '@/lib/medical-operations'
import {
  CheckCircleIcon,
  ShoppingCartIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface PurchaseConfirmationProps {
  pendingItems: ShoppingItem[]
  onConfirm: () => void // Callback to refresh the shopping list
  memberId?: string // Optional member/patient ID for recipe link
}

export function PurchaseConfirmation({ pendingItems, onConfirm, memberId }: PurchaseConfirmationProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [store, setStore] = useState('')
  const [defaultMemberId, setDefaultMemberId] = useState<string | null>(null)

  // Fetch user's first family member if no memberId is provided
  useEffect(() => {
    if (!memberId) {
      const fetchFirstMember = async () => {
        try {
          const members = await medicalOperations.patients.getPatients()
          if (members && members.length > 0) {
            setDefaultMemberId(members[0].id)
          }
        } catch (error) {
          logger.error('[PurchaseConfirmation] Error fetching family members', error as Error)
        }
      }
      fetchFirstMember()
    }
  }, [memberId])

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

      // Log detailed results for debugging
      if (result.results) {
        const failedItems = result.results.filter((r: any) => !r.success)
        if (failedItems.length > 0) {
          console.error('[PurchaseConfirmation] Failed items:', failedItems)
        }
      }

      // Show success message with link to recipes
      if (result.summary.successful > 0) {
        // Use memberId if provided, otherwise use the first family member, otherwise use general recipes
        const targetId = memberId || defaultMemberId
        const recipeUrl = targetId ? `/patients/${targetId}?tab=recipes` : '/recipes'

        toast.success(
          (t) => (
            <div className="flex flex-col gap-2">
              <span className="font-semibold">✓ Added {result.summary.successful} item(s) to inventory!</span>
              <a
                href={recipeUrl}
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded font-medium inline-block text-center"
                onClick={() => toast.dismiss(t.id)}
              >
                🍳 See What You Can Cook Now →
              </a>
            </div>
          ),
          { duration: 8000 }
        )
      }

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
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-secondary-light rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ShoppingCartIcon className="h-6 w-6 text-secondary" />
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Confirm Purchases
            </h2>
            <p className="text-sm text-muted-foreground">
              {pendingItems.length} item{pendingItems.length !== 1 ? 's' : ''} pending confirmation
            </p>
          </div>
        </div>

        {selectedCount > 0 && (
          <button
            onClick={() => setSelectedItems(new Set())}
            className="text-sm text-secondary hover:underline"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Optional Store Input */}
      <div className="mb-4">
        <label htmlFor="store-input" className="block text-sm font-medium text-foreground mb-2">
          Store Name (Optional)
        </label>
        <input
          id="store-input"
          type="text"
          value={store}
          onChange={(e) => setStore(e.target.value)}
          placeholder="e.g., Walmart, Target, Whole Foods..."
          className="w-full px-4 py-2 border border-border dark:border-gray-600 bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Select All Checkbox */}
      <div className="flex items-center mb-3 pb-3 border-b border-secondary-light">
        <label className="flex items-center gap-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 p-2 rounded-lg transition-colors w-full">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            className="w-5 h-5 text-secondary border-border dark:border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="font-medium text-foreground">
            Select All ({pendingItems.length})
          </span>
        </label>
      </div>

      {/* Item List */}
      <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
        {pendingItems.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-blue-300 dark:hover:border-secondary cursor-pointer transition-all"
          >
            <input
              type="checkbox"
              checked={selectedItems.has(item.id)}
              onChange={() => handleToggleItem(item.id)}
              className="w-5 h-5 text-secondary border-border dark:border-gray-600 rounded focus:ring-blue-500 flex-shrink-0"
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
              <div className="font-medium text-foreground truncate">
                {item.productName}
              </div>
              {item.brand && (
                <div className="text-sm text-muted-foreground dark:text-muted-foreground truncate">
                  {item.brand}
                </div>
              )}
              <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                {item.displayQuantity || `${item.quantity} ${item.unit || 'item'}`}
              </div>
            </div>

            {/* Category Badge */}
            <div className="px-2 py-1 text-xs font-medium bg-muted dark:bg-gray-700 text-foreground rounded capitalize flex-shrink-0">
              {item.category}
            </div>
          </label>
        ))}
      </div>

      {/* Confirm Button */}
      <button
        onClick={handleConfirmPurchases}
        disabled={selectedCount === 0 || confirming}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary-hover disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
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
      <p className="text-xs text-muted-foreground mt-3 text-center">
        Confirming items will mark them as in stock and calculate expiration dates
      </p>
    </div>
  )
}
