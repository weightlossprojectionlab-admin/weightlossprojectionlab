'use client'

/**
 * Smart Suggestions Component
 *
 * Shows AI-powered shopping suggestions:
 * - Items "due to buy" based on purchase patterns
 * - Frequently bought together items
 */

import { useState, useEffect } from 'react'
import { LightBulbIcon, ClockIcon, ShoppingBagIcon, PlusIcon } from '@heroicons/react/24/outline'
import { findDueToBuyItems, findFrequentlyBoughtTogether } from '@/lib/purchase-learning'
import type { ShoppingItem } from '@/types/shopping'
import type { DueToBuyItem, FrequentlyBoughtTogether } from '@/lib/purchase-learning'

interface SmartSuggestionsProps {
  items: ShoppingItem[]
  onAddItem: (itemName: string) => Promise<void>
  className?: string
}

export function SmartSuggestions({
  items,
  onAddItem,
  className = '',
}: SmartSuggestionsProps) {
  const [dueToBuy, setDueToBuy] = useState<DueToBuyItem[]>([])
  const [frequentPairs, setFrequentPairs] = useState<FrequentlyBoughtTogether[]>([])
  const [adding, setAdding] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'dueToBuy' | 'frequent'>('dueToBuy')

  useEffect(() => {
    // Calculate suggestions
    const dueItems = findDueToBuyItems(items)
    setDueToBuy(dueItems.slice(0, 5)) // Top 5

    // Find frequently bought together for items already on the list
    const neededItems = items.filter(item => item.needed)
    if (neededItems.length > 0) {
      const pairs = findFrequentlyBoughtTogether(neededItems[0], items, 2)
      setFrequentPairs(pairs.slice(0, 5))
    }
  }, [items])

  const handleAddItem = async (itemName: string) => {
    try {
      setAdding(itemName)
      await onAddItem(itemName)
    } catch (error) {
      console.error('Error adding item:', error)
    } finally {
      setAdding(null)
    }
  }

  // Don't show if no suggestions
  if (dueToBuy.length === 0 && frequentPairs.length === 0) {
    return null
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <LightBulbIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Smart Suggestions
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveTab('dueToBuy')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'dueToBuy'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <ClockIcon className="h-4 w-4" />
            <span>Due to Buy ({dueToBuy.length})</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('frequent')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'frequent'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <ShoppingBagIcon className="h-4 w-4" />
            <span>Frequently Together ({frequentPairs.length})</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {activeTab === 'dueToBuy' && dueToBuy.length > 0 && (
          <>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Based on your purchase history
            </p>
            {dueToBuy.map((item) => (
              <div
                key={item.item.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {item.item.productName}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Usually bought every {item.expectedDays} days
                    {' · '}
                    {item.daysSinceLastPurchase} days since last purchase
                  </div>
                </div>
                <button
                  onClick={() => handleAddItem(item.item.productName)}
                  disabled={adding === item.item.productName}
                  className="ml-3 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                  aria-label={`Add ${item.item.productName} to shopping list`}
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </>
        )}

        {activeTab === 'frequent' && frequentPairs.length > 0 && (
          <>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Often bought with items on your list
            </p>
            {frequentPairs.map((pair, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {pair.productName}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Bought together {pair.coOccurrences} times
                    {' · '}
                    {Math.round(pair.confidence * 100)}% confidence
                  </div>
                </div>
                <button
                  onClick={() => handleAddItem(pair.productName)}
                  disabled={adding === pair.productName}
                  className="ml-3 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                  aria-label={`Add ${pair.productName} to shopping list`}
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </>
        )}

        {activeTab === 'dueToBuy' && dueToBuy.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No suggestions yet. Purchase more items to see patterns!
          </p>
        )}

        {activeTab === 'frequent' && frequentPairs.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Add items to your list to see suggestions
          </p>
        )}
      </div>
    </div>
  )
}
