import Link from 'next/link'

/**
 * "Take Kitchen Inventory First" advisory — the single source for prompting a user to count
 * what's on hand when there's no on-hand inventory data. Extracted from RecipeView so the
 * Health Summary (and any future surface) reuses the exact same UI + intent instead of forking.
 *
 * Purely presentational: the caller decides WHEN to show it (i.e. computes "has inventory" from
 * inStock===true, the canonical on-hand definition — see getInventoryItems). Defaults reproduce
 * RecipeView's original copy so its behavior is unchanged.
 */
export interface TakeInventoryPromptProps {
  title?: string
  message?: string
  ctaHref?: string
  ctaLabel?: string
  /** Extra layout classes from the caller (e.g. RecipeView's `mt-auto mb-4`). */
  className?: string
}

export function TakeInventoryPrompt({
  title = 'Take Kitchen Inventory First',
  message = 'Can you make this with what you have? Add your ingredients to find out!',
  ctaHref = '/shopping',
  ctaLabel = '🛒 Add Ingredients to Shopping List',
  className = '',
}: TakeInventoryPromptProps) {
  return (
    <div
      className={`bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 border-2 border-orange-400 dark:border-orange-600 rounded-lg p-3 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-2xl">📦</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-orange-900 dark:text-orange-100 mb-1">{title}</p>
          <p className="text-xs text-orange-800 dark:text-orange-200">{message}</p>
        </div>
      </div>
      <Link
        href={ctaHref}
        onClick={(e) => e.stopPropagation()}
        className="block w-full text-center px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-xs font-semibold transition-colors"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}

export default TakeInventoryPrompt
