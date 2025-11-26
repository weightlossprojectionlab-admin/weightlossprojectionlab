'use client'

/**
 * Scan Context Modal
 *
 * Asks user what they're scanning for (meal logging, purchasing, consuming, or inventory)
 */

import type { ScanContext } from '@/types/shopping'

export interface ScanContextModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectContext: (context: ScanContext) => void
  excludeContexts?: ScanContext[] // Optional: contexts to hide from the modal
}

export function ScanContextModal({ isOpen, onClose, onSelectContext, excludeContexts = [] }: ScanContextModalProps) {
  if (!isOpen) return null

  const allOptions: { context: ScanContext; icon: string; title: string; description: string; color: string }[] = [
    {
      context: 'purchase',
      icon: '🛒',
      title: 'Just Bought This',
      description: 'Add newly purchased items to inventory',
      color: 'bg-success-light dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
    },
    {
      context: 'consume',
      icon: '🗑️',
      title: 'Used Up / Threw Away',
      description: 'Mark items as consumed and add to shopping list',
      color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30'
    },
    {
      context: 'inventory',
      icon: '📦',
      title: 'Check Inventory',
      description: 'View or update quantity of items you have',
      color: 'bg-secondary-light border-secondary-light hover:bg-blue-100 dark:hover:bg-blue-900/30'
    },
    {
      context: 'meal',
      icon: '🍽️',
      title: 'Log a Meal',
      description: 'Record food consumption for tracking',
      color: 'bg-primary-light border-primary-light hover:bg-primary-light dark:hover:bg-purple-900/30'
    }
  ]

  // Filter out excluded contexts
  const options = allOptions.filter(option => !excludeContexts.includes(option.context))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">
            What are you scanning?
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

        {/* Options */}
        <div className="space-y-3">
          {options.map((option) => (
            <button
              type="button"
              key={option.context}
              onClick={() => onSelectContext(option.context)}
              className={`w-full p-4 rounded-lg border-2 ${option.color} transition-all duration-200 text-left`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{option.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">
                    {option.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Cancel */}
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 px-4 py-3 border border-border text-foreground rounded-lg hover:bg-background transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
