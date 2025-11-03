'use client'

/**
 * Quantity Adjuster Component
 *
 * Allows users to adjust item quantity for partial consumption
 * Features:
 * - Quick presets (1/4, 1/2, 3/4, full)
 * - Manual input for precise control
 * - Unit display (lbs, oz, cups, etc.)
 * - Visual feedback with progress bar
 * - Auto-calculate remaining quantity
 * - Mark as "Used Up" option
 */

import { useState } from 'react'
import { MinusIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { ShoppingItem, QuantityUnit } from '@/types/shopping'

interface QuantityAdjusterProps {
  item: ShoppingItem
  isOpen: boolean
  onClose: () => void
  onAdjust: (itemId: string, newQuantity: number) => Promise<void>
  onUseUp: (itemId: string) => Promise<void>
}

export function QuantityAdjuster({
  item,
  isOpen,
  onClose,
  onAdjust,
  onUseUp
}: QuantityAdjusterProps) {
  const [quantity, setQuantity] = useState(item.quantity)
  const [loading, setLoading] = useState(false)

  const initialQuantity = item.quantity
  const unit = item.unit || 'units'

  // Quick preset buttons
  const presets = [
    { label: '1/4', value: initialQuantity * 0.25 },
    { label: '1/2', value: initialQuantity * 0.5 },
    { label: '3/4', value: initialQuantity * 0.75 },
    { label: 'Full', value: initialQuantity }
  ]

  /**
   * Handle preset button click
   */
  const handlePreset = (value: number) => {
    setQuantity(Math.max(0, value))
  }

  /**
   * Increment quantity
   */
  const handleIncrement = () => {
    const step = getStepSize(unit)
    setQuantity(Math.min(initialQuantity, quantity + step))
  }

  /**
   * Decrement quantity
   */
  const handleDecrement = () => {
    const step = getStepSize(unit)
    setQuantity(Math.max(0, quantity - step))
  }

  /**
   * Handle manual input
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value)) {
      setQuantity(Math.max(0, Math.min(initialQuantity, value)))
    }
  }

  /**
   * Confirm adjustment
   */
  const handleConfirm = async () => {
    setLoading(true)
    try {
      if (quantity <= 0) {
        // If quantity is 0, mark as used up
        await onUseUp(item.id)
      } else {
        // Otherwise just adjust the quantity
        await onAdjust(item.id, quantity)
      }
      onClose()
    } catch (error) {
      console.error('[QuantityAdjuster] Error adjusting quantity:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Mark as used up
   */
  const handleUseUp = async () => {
    setLoading(true)
    try {
      await onUseUp(item.id)
      onClose()
    } catch (error) {
      console.error('[QuantityAdjuster] Error marking as used up:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Calculate percentage remaining
   */
  const percentageRemaining = initialQuantity > 0
    ? (quantity / initialQuantity) * 100
    : 0

  /**
   * Get color based on percentage
   */
  const getProgressColor = () => {
    if (percentageRemaining > 66) return 'bg-green-500'
    if (percentageRemaining > 33) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Adjust Quantity
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Product Info */}
          <div className="flex items-center gap-3">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.productName}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {item.productName}
              </h3>
              {item.brand && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.brand}
                </p>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Remaining
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {percentageRemaining.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${percentageRemaining}%` }}
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Select
            </label>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset.value)}
                  disabled={loading}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                    Math.abs(quantity - preset.value) < 0.01
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Adjustment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Precise Amount
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDecrement}
                disabled={loading || quantity <= 0}
                className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Decrease quantity"
              >
                <MinusIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </button>

              <div className="flex-1 relative">
                <input
                  type="number"
                  value={quantity.toFixed(2)}
                  onChange={handleInputChange}
                  disabled={loading}
                  min={0}
                  max={initialQuantity}
                  step={getStepSize(unit)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-center text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-600 dark:text-gray-400">
                  {unit}
                </span>
              </div>

              <button
                onClick={handleIncrement}
                disabled={loading || quantity >= initialQuantity}
                className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Increase quantity"
              >
                <PlusIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
              Original: {initialQuantity.toFixed(2)} {unit}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleConfirm}
              disabled={loading || quantity === initialQuantity}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckIcon className="h-5 w-5" />
              {quantity <= 0 ? 'Mark as Used Up' : 'Update Quantity'}
            </button>

            <button
              onClick={handleUseUp}
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-red-500 text-red-600 dark:text-red-400 rounded-lg font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark as Used Up
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Get appropriate step size based on unit
 */
function getStepSize(unit: QuantityUnit | string): number {
  const smallUnits = ['oz', 'ml', 'g', 'tsp', 'tbsp']
  const mediumUnits = ['cup', 'lb', 'kg', 'L']

  if (smallUnits.includes(unit)) return 1
  if (mediumUnits.includes(unit)) return 0.25
  return 1 // Default for 'units' or unknown
}
