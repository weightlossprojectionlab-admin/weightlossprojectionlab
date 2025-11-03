'use client'

/**
 * Category Confirm Modal Component
 *
 * Allows users to confirm or correct product category classification.
 * Important for proper inventory organization and expiration tracking.
 */

import { useState } from 'react'
import { ProductCategory } from '@/types/shopping'
import { getCategoryMetadata } from '@/lib/product-categories'

interface CategoryConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  currentCategory: ProductCategory
  productName: string
  onConfirm: (selectedCategory: ProductCategory) => void
}

export function CategoryConfirmModal({
  isOpen,
  onClose,
  currentCategory,
  productName,
  onConfirm
}: CategoryConfirmModalProps) {
  const [selectedCategory, setSelectedCategory] = useState(currentCategory)

  if (!isOpen) return null

  const categories: ProductCategory[] = [
    'produce',
    'meat',
    'seafood',
    'dairy',
    'eggs',
    'bakery',
    'deli',
    'herbs',
    'frozen',
    'beverages',
    'pantry',
    'other'
  ]

  const handleConfirm = () => {
    onConfirm(selectedCategory)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Confirm Product Category
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Where should <span className="font-semibold">{productName}</span> be stored?
        </p>

        {/* Category Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {categories.map(cat => {
            const meta = getCategoryMetadata(cat)
            const isSelected = selectedCategory === cat
            const isSuggested = cat === currentCategory

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`p-3 rounded-lg border-2 transition-all relative ${
                  isSelected
                    ? 'border-primary bg-primary/10 scale-105'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:scale-102'
                }`}
              >
                {isSuggested && !isSelected && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    Auto
                  </div>
                )}
                <div className="text-2xl mb-1">{meta.icon}</div>
                <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  {meta.displayName}
                </div>
              </button>
            )
          })}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            💡 Category determines storage location and expiration tracking.
            {getCategoryMetadata(selectedCategory).isPerishable &&
              ' This category requires expiration dates.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-gray-900 dark:text-gray-100"
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
