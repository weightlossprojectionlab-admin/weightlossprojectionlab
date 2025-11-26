'use client'

/**
 * Quantity Adjust Modal Component
 *
 * Allows users to specify how many units of an item they're buying.
 * Useful for bulk purchases or buying multiple of the same item.
 */

import { useState } from 'react'
import { ShoppingItem } from '@/types/shopping'
import { getCategoryMetadata } from '@/lib/product-categories'

interface QuantityAdjustModalProps {
  isOpen: boolean
  onClose: () => void
  item: ShoppingItem
  onConfirm: (quantity: number) => void
}

export function QuantityAdjustModal({
  isOpen,
  onClose,
  item,
  onConfirm
}: QuantityAdjustModalProps) {
  const [quantity, setQuantity] = useState(item.quantity || 1)
  const categoryMeta = getCategoryMetadata(item.category)

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(quantity)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <h2 className="text-xl font-bold text-foreground mb-2">
          Adjust Quantity
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          How many units are you buying?
        </p>

        {/* Product Display */}
        <div className="flex items-center gap-3 mb-6 p-3 bg-background rounded-lg">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.productName}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-muted dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
              {categoryMeta.icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">
              {item.productName}
            </h3>
            {item.brand && (
              <p className="text-xs text-muted-foreground truncate">
                {item.brand}
              </p>
            )}
          </div>
        </div>

        {/* Quantity Picker */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <div className="text-center min-w-[100px]">
            <div className="text-5xl font-bold text-primary">{quantity}</div>
            <div className="text-sm text-muted-foreground mt-1">
              unit{quantity > 1 ? 's' : ''}
            </div>
          </div>
          <button
            onClick={() => setQuantity(quantity + 1)}
            disabled={quantity >= 99}
            className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        {/* Quick Select Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[1, 2, 5, 10].map(num => (
            <button
              key={num}
              onClick={() => setQuantity(num)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                quantity === num
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-gray-200'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-muted rounded-lg hover:bg-gray-200 transition-colors font-medium text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
