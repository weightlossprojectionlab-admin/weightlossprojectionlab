'use client'

/**
 * Item Action Menu Component
 *
 * Multi-functional hub for each shopping list item:
 * - Scan & check off
 * - Adjust quantity
 * - Scan replacement
 * - Chat with family (future)
 *
 * This is the entry point for per-item shopping actions
 */

import { ShoppingItem } from '@/types/shopping'
import { getCategoryMetadata } from '@/lib/product-categories'

interface ItemActionMenuProps {
  isOpen: boolean
  onClose: () => void
  item: ShoppingItem
  onScan: () => void
  onAdjustQuantity: () => void
  onReplacement: () => void
  onChat: () => void // Future feature hook
}

export function ItemActionMenu({
  isOpen,
  onClose,
  item,
  onScan,
  onAdjustQuantity,
  onReplacement,
  onChat
}: ItemActionMenuProps) {
  if (!isOpen) return null

  const categoryMeta = getCategoryMetadata(item.category)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.productName}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-3xl">
              {categoryMeta.icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
              {item.productName}
            </h2>
            {item.brand && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {item.brand}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Scan to Check Off */}
          <button
            onClick={onScan}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-3"
          >
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <div className="flex-1 text-left">
              <div className="font-semibold">Scan & Check Off</div>
              <div className="text-xs opacity-90">Found this exact item</div>
            </div>
          </button>

          {/* Adjust Quantity */}
          <button
            onClick={onAdjustQuantity}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-3"
          >
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <div className="flex-1 text-left">
              <div className="font-semibold">Adjust Quantity</div>
              <div className="text-xs opacity-90">Buying multiple units</div>
            </div>
          </button>

          {/* Scan Replacement */}
          <button
            onClick={onReplacement}
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-3"
          >
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <div className="flex-1 text-left">
              <div className="font-semibold">Scan Replacement</div>
              <div className="text-xs opacity-90">Different brand or size</div>
            </div>
          </button>

          {/* Future: Chat with Family (Placeholder) */}
          <button
            onClick={onChat}
            disabled
            className="w-full px-4 py-3 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg cursor-not-allowed flex items-center gap-3 relative opacity-60"
            title="Coming soon - collaborate with family on shopping"
          >
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <div className="flex-1 text-left">
              <div className="font-semibold">Ask Family</div>
              <div className="text-xs">Coming soon</div>
            </div>
            <span className="absolute top-2 right-2 text-xs bg-gray-400 dark:bg-gray-600 text-white px-2 py-0.5 rounded-full font-medium">
              Soon
            </span>
          </button>

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-gray-900 dark:text-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
