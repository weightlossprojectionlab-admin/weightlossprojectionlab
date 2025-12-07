'use client'

/**
 * Expired Items Cleanup List Component
 *
 * Displays expired inventory items organized by risk level
 * Provides bulk selection and discard actions
 * Shows AI-powered spoilage indicators
 */

import { useState, useCallback } from 'react'
import { ShoppingItem } from '@/types/shopping'
import { format } from 'date-fns'
import { logger } from '@/lib/logger'

interface ExpiredItem extends ShoppingItem {
  daysExpired: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

interface ExpiredItemsCleanupListProps {
  expiredItems: ExpiredItem[]
  criticalItems: ExpiredItem[]
  highRiskItems: ExpiredItem[]
  mediumRiskItems: ExpiredItem[]
  lowRiskItems: ExpiredItem[]
  onDiscardSelected: (itemIds: string[], addToShoppingList: boolean) => Promise<void>
  loading?: boolean
}

export function ExpiredItemsCleanupList({
  expiredItems,
  criticalItems,
  highRiskItems,
  mediumRiskItems,
  lowRiskItems,
  onDiscardSelected,
  loading = false
}: ExpiredItemsCleanupListProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [addToShoppingList, setAddToShoppingList] = useState(true)
  const [discarding, setDiscarding] = useState(false)

  /**
   * Toggle item selection
   */
  const toggleItem = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  /**
   * Select all items in a category
   */
  const selectCategory = useCallback((items: ExpiredItem[]) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      items.forEach(item => next.add(item.id))
      return next
    })
  }, [])

  /**
   * Deselect all items in a category
   */
  const deselectCategory = useCallback((items: ExpiredItem[]) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      items.forEach(item => next.delete(item.id))
      return next
    })
  }, [])

  /**
   * Select all expired items
   */
  const selectAll = useCallback(() => {
    setSelectedItems(new Set(expiredItems.map(item => item.id)))
  }, [expiredItems])

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  /**
   * Handle discard action
   */
  const handleDiscard = useCallback(async () => {
    if (selectedItems.size === 0) return

    setDiscarding(true)
    try {
      await onDiscardSelected(Array.from(selectedItems), addToShoppingList)
      setSelectedItems(new Set()) // Clear selection after successful discard
    } catch (error) {
      logger.error('[ExpiredItemsCleanupList] Discard failed', error as Error)
    } finally {
      setDiscarding(false)
    }
  }, [selectedItems, addToShoppingList, onDiscardSelected])

  /**
   * Get risk level color classes
   */
  const getRiskColorClasses = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700'
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700'
      case 'low':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700'
    }
  }

  /**
   * Render category section
   */
  const renderCategory = (
    title: string,
    items: ExpiredItem[],
    riskLevel: string,
    icon: string
  ) => {
    if (items.length === 0) return null

    const allSelected = items.every(item => selectedItems.has(item.id))
    const someSelected = items.some(item => selectedItems.has(item.id))

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({items.length} {items.length === 1 ? 'item' : 'items'})
            </span>
          </div>
          <button
            onClick={() =>
              allSelected ? deselectCategory(items) : selectCategory(items)
            }
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedItems.has(item.id)
                  ? getRiskColorClasses(riskLevel)
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => toggleItem(item.id)}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => toggleItem(item.id)}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  onClick={e => e.stopPropagation()}
                />

                {/* Item details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {item.productName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                          {item.location}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Qty: {item.quantity}
                        </span>
                        {item.expiresAt && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Expired: {item.expiresAt instanceof Date && !isNaN(item.expiresAt.getTime())
                              ? format(item.expiresAt, 'MMM d, yyyy')
                              : 'Invalid date'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Days expired badge */}
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${getRiskColorClasses(riskLevel)}`}>
                      {item.daysExpired} {item.daysExpired === 1 ? 'day' : 'days'} ago
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (expiredItems.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✨</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No Expired Items
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Your kitchen inventory is fresh and up to date!
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Summary header */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Expired Items Cleanup
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {selectedItems.size > 0
                ? `${selectedItems.size} of ${expiredItems.length} items selected`
                : `${expiredItems.length} expired ${expiredItems.length === 1 ? 'item' : 'items'} found`}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedItems.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Clear Selection
              </button>
            )}
            {expiredItems.length > 0 && selectedItems.size === 0 && (
              <button
                onClick={selectAll}
                className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                Select All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category sections */}
      {renderCategory('Critical Risk', criticalItems, 'critical', '🚨')}
      {renderCategory('High Risk', highRiskItems, 'high', '⚠️')}
      {renderCategory('Medium Risk', mediumRiskItems, 'medium', '⏰')}
      {renderCategory('Low Risk', lowRiskItems, 'low', 'ℹ️')}

      {/* Action footer */}
      {selectedItems.size > 0 && (
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 -mx-6 -mb-6 mt-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={addToShoppingList}
                onChange={e => setAddToShoppingList(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              Add to shopping list
            </label>

            <button
              onClick={handleDiscard}
              disabled={discarding}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {discarding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Discarding...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
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
                  Discard {selectedItems.size} {selectedItems.size === 1 ? 'Item' : 'Items'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
