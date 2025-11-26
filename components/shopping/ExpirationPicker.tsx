'use client'

/**
 * Expiration Date Picker
 *
 * Smart component for quickly setting expiration dates on grocery items
 * Shows quick options based on product category
 */

import { useState } from 'react'
import type { ProductCategory, QuantityUnit } from '@/types/shopping'
import { getQuickExpirationOptions, calculateDefaultExpiration, suggestDefaultUnit } from '@/lib/product-categories'

export interface ExpirationPickerProps {
  category: ProductCategory
  productName: string
  isOpen: boolean
  onClose: () => void
  onSelectDate: (date: Date, quantity?: number, unit?: QuantityUnit) => void
  onSkip: (quantity?: number, unit?: QuantityUnit) => void
  defaultQuantity?: number
  defaultUnit?: QuantityUnit
}

export function ExpirationPicker({
  category,
  productName,
  isOpen,
  onClose,
  onSelectDate,
  onSkip,
  defaultQuantity = 1,
  defaultUnit
}: ExpirationPickerProps) {
  const [customDate, setCustomDate] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [quantity, setQuantity] = useState(defaultQuantity)
  const [unit, setUnit] = useState<QuantityUnit>(defaultUnit || suggestDefaultUnit(category))

  if (!isOpen) return null

  const quickOptions = getQuickExpirationOptions(category)
  const defaultExpiration = calculateDefaultExpiration(category)

  // Available units based on category
  const getUnitsForCategory = (): QuantityUnit[] => {
    switch (category) {
      case 'produce':
        return ['lbs', 'oz', 'count', 'bunch', 'bag']
      case 'meat':
      case 'seafood':
      case 'deli':
        return ['lbs', 'oz', 'package']
      case 'dairy':
        return ['count', 'gal', 'qt', 'oz', 'container']
      case 'eggs':
        return ['count']
      case 'bakery':
        return ['count', 'package']
      case 'herbs':
        return ['bunch', 'oz', 'package']
      case 'pantry':
      case 'frozen':
        return ['package', 'can', 'bag', 'bottle', 'lbs', 'oz']
      case 'beverages':
        return ['bottle', 'can', 'gal', 'l', 'count']
      default:
        return ['count', 'package', 'lbs', 'oz']
    }
  }

  const availableUnits = getUnitsForCategory()

  const handleQuickSelect = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    onSelectDate(date, quantity, unit)
  }

  const handleCustomDateSubmit = () => {
    if (customDate) {
      const date = new Date(customDate)
      if (!isNaN(date.getTime())) {
        onSelectDate(date, quantity, unit)
      }
    }
  }

  const handleSkip = () => {
    onSkip(quantity, unit)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">
            When does this expire?
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Product Name */}
        <p className="text-sm text-muted-foreground mb-4">
          <span className="font-semibold">{productName}</span>
        </p>

        {/* Quantity and Unit Inputs */}
        <div className="mb-6 p-4 bg-background rounded-lg">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            How much did you get?
          </h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as QuantityUnit)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {availableUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Default Suggestion */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => onSelectDate(defaultExpiration, quantity, unit)}
            className="w-full p-4 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-between"
          >
            <div className="text-left">
              <div className="font-semibold">Use Typical Expiration</div>
              <div className="text-sm opacity-90">
                {defaultExpiration.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Quick Options */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Quick Options
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {quickOptions.map((option) => (
              <button
                type="button"
                key={option.days}
                onClick={() => handleQuickSelect(option.days)}
                className="p-3 border-2 border-border rounded-lg hover:border-primary dark:hover:border-primary hover:bg-background transition-colors text-center"
              >
                <div className="font-semibold text-foreground">
                  {option.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const date = new Date()
                    date.setDate(date.getDate() + option.days)
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  })()}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Input */}
        {!showCustomInput ? (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="w-full p-3 border border-border text-foreground rounded-lg hover:bg-background transition-colors text-sm font-medium"
          >
            📅 Pick Custom Date
          </button>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Custom Expiration Date
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <button
                type="button"
                onClick={handleCustomDateSubmit}
                disabled={!customDate}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Set
              </button>
            </div>
          </div>
        )}

        {/* Skip/No Expiration */}
        <button
          type="button"
          onClick={handleSkip}
          className="w-full mt-4 px-4 py-3 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
        >
          Skip - No expiration date
        </button>
      </div>
    </div>
  )
}
