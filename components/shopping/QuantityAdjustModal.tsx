'use client'

/**
 * Generic Quantity Modal
 *
 * Small "how many?" prompt with +/− buttons and quick-select shortcuts.
 * Shared between the shopping checkout flow, the inventory "Used Up"
 * partial-consumption flow, and the inventory "Buy Again" restock flow.
 *
 * Originally tied to ShoppingItem; decoupled to a flat product-info
 * shape so any caller can use it without constructing a ShoppingItem.
 * The behavior of the +/− buttons is unchanged from the prior version.
 */

import { useEffect, useState } from 'react'
import { getCategoryMetadata } from '@/lib/product-categories'
import type { ProductCategory } from '@/types/shopping'

export interface QuantityAdjustProductInfo {
  productName: string
  brand?: string
  imageUrl?: string
  category: ProductCategory
}

interface QuantityAdjustModalProps {
  isOpen: boolean
  onClose: () => void
  product: QuantityAdjustProductInfo
  onConfirm: (quantity: number) => void

  /** Modal heading. Defaults to "Adjust Quantity". */
  title?: string
  /** Sub-heading copy under the title. Defaults to "How many units?". */
  subtitle?: string
  /** Quantity selected when the modal opens. Defaults to 1. */
  defaultQuantity?: number
  /** Minimum allowed quantity. Defaults to 1. */
  minQuantity?: number
  /** Maximum allowed quantity. Defaults to 99. */
  maxQuantity?: number
  /** Label appended to the big quantity number — e.g. "unit"/"units" (default), "oz", "can". */
  unitLabel?: string
  /** CTA text. Defaults to "Confirm". */
  confirmLabel?: string
}

export function QuantityAdjustModal({
  isOpen,
  onClose,
  product,
  onConfirm,
  title = 'Adjust Quantity',
  subtitle = 'How many units?',
  defaultQuantity = 1,
  minQuantity = 1,
  maxQuantity = 99,
  unitLabel,
  confirmLabel = 'Confirm',
}: QuantityAdjustModalProps) {
  const [quantity, setQuantity] = useState(defaultQuantity)
  const categoryMeta = getCategoryMetadata(product.category)

  // Reset quantity each time the modal re-opens with a new default
  useEffect(() => {
    if (isOpen) setQuantity(defaultQuantity)
  }, [isOpen, defaultQuantity])

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(quantity)
    onClose()
  }

  const dec = () => setQuantity((q) => Math.max(minQuantity, q - 1))
  const inc = () => setQuantity((q) => Math.min(maxQuantity, q + 1))
  const baseLabel = unitLabel ?? 'unit'
  const displayLabel = quantity === 1 ? baseLabel : `${baseLabel}s`

  // Quick-select limited to the [min, max] range
  const quickSelectOptions = [1, 2, 5, 10].filter((n) => n >= minQuantity && n <= maxQuantity)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>

        {/* Product display */}
        <div className="flex items-center gap-3 mb-6 p-3 bg-background rounded-lg">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.productName}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-muted dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
              {categoryMeta.icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">{product.productName}</h3>
            {product.brand && (
              <p className="text-xs text-muted-foreground truncate">{product.brand}</p>
            )}
          </div>
        </div>

        {/* Quantity picker */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={dec}
            disabled={quantity <= minQuantity}
            className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <div className="text-center min-w-[100px]">
            <div className="text-5xl font-bold text-primary">{quantity}</div>
            <div className="text-sm text-muted-foreground mt-1">{displayLabel}</div>
          </div>
          <button
            onClick={inc}
            disabled={quantity >= maxQuantity}
            className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        {/* Quick-select shortcuts */}
        {quickSelectOptions.length > 0 && (
          <div className={`grid gap-2 mb-6`} style={{ gridTemplateColumns: `repeat(${quickSelectOptions.length}, minmax(0, 1fr))` }}>
            {quickSelectOptions.map((num) => (
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
        )}

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
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
