'use client'

/**
 * Swipeable Shopping Item
 *
 * Shopping list item with swipe gestures:
 * - Swipe right: Mark as purchased
 * - Swipe left: Delete
 */

import { useState, useMemo } from 'react'
import { useSwipeable, SwipeEventData } from 'react-swipeable'
import { CheckCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import type { ShoppingItem } from '@/types/shopping'
import { MEAL_SUGGESTIONS } from '@/lib/meal-suggestions'
import { FamilyMemberBadge } from './FamilyMemberBadge'

interface SwipeableShoppingItemProps {
  item: ShoppingItem
  onPurchase: (itemId: string) => Promise<void>
  onDelete: (itemId: string) => Promise<void>
  onClick?: (item: ShoppingItem) => void
  getMemberName?: (userId?: string) => string
  className?: string
}

export function SwipeableShoppingItem({
  item,
  onPurchase,
  onDelete,
  onClick,
  getMemberName,
  className = '',
}: SwipeableShoppingItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const swipeThreshold = 100 // pixels

  // Look up recipe name if primaryRecipeId exists
  const recipeName = useMemo(() => {
    if (!item.primaryRecipeId) return null
    const recipe = MEAL_SUGGESTIONS.find(r => r.id === item.primaryRecipeId)
    return recipe?.name || null
  }, [item.primaryRecipeId])

  const handlers = useSwipeable({
    onSwiping: (eventData: SwipeEventData) => {
      setIsSwiping(true)
      // Limit swipe offset
      const offset = Math.max(-200, Math.min(200, eventData.deltaX))
      setSwipeOffset(offset)
    },
    onSwipedLeft: (eventData: SwipeEventData) => {
      if (Math.abs(eventData.deltaX) > swipeThreshold) {
        // Swipe left = delete
        onDelete(item.id)
      }
      setSwipeOffset(0)
      setIsSwiping(false)
    },
    onSwipedRight: (eventData: SwipeEventData) => {
      if (eventData.deltaX > swipeThreshold) {
        // Swipe right = mark as purchased
        onPurchase(item.id)
      }
      setSwipeOffset(0)
      setIsSwiping(false)
    },
    onSwiped: () => {
      setSwipeOffset(0)
      setIsSwiping(false)
    },
    trackMouse: false, // Disable mouse swiping (touch only)
    trackTouch: true,
  })

  const handleClick = () => {
    if (!isSwiping && onClick) {
      onClick(item)
    }
  }

  // Calculate background color based on swipe direction
  const getBackgroundColor = () => {
    if (swipeOffset > swipeThreshold) {
      return 'bg-green-100 dark:bg-green-900/30'
    } else if (swipeOffset < -swipeThreshold) {
      return 'bg-red-100 dark:bg-red-900/30'
    }
    return 'bg-background'
  }

  // Show action icons when swiping
  const showPurchaseIcon = swipeOffset > 20
  const showDeleteIcon = swipeOffset < -20

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* Background action indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        {/* Purchase indicator (left side) */}
        <div
          className={`flex items-center gap-2 transition-opacity ${
            showPurchaseIcon ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <CheckCircleIcon className="h-6 w-6 text-success dark:text-green-400" />
          <span className="font-medium text-success dark:text-green-400">
            Purchase
          </span>
        </div>

        {/* Delete indicator (right side) */}
        <div
          className={`flex items-center gap-2 transition-opacity ${
            showDeleteIcon ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="font-medium text-error">
            Delete
          </span>
          <TrashIcon className="h-6 w-6 text-error" />
        </div>
      </div>

      {/* Swipeable item */}
      <div
        {...handlers}
        onClick={handleClick}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
        }}
        className={`relative p-4 border border-border rounded-lg cursor-pointer ${getBackgroundColor()} transition-colors`}
      >
        {/* Priority indicator */}
        {item.priority === 'high' && (
          <div className="absolute top-2 left-2 w-2 h-2 bg-error-light0 rounded-full" />
        )}

        {/* Item content */}
        <div className="flex items-start gap-3">
          {/* Product image or category icon */}
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.productName}
              className="w-12 h-12 object-cover rounded"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
              <span className="text-xl">{getCategoryEmoji(item.category)}</span>
            </div>
          )}

          {/* Item info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground dark:text-white">
              {item.productName}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <div className="text-sm text-muted-foreground">
                {item.displayQuantity || `${item.quantity} ${item.unit || 'units'}`}
              </div>
              {/* Family member badge */}
              <FamilyMemberBadge
                requestedBy={item.requestedBy}
                addedBy={item.addedBy}
                getMemberName={getMemberName}
              />
            </div>
            {/* Recipe badge */}
            {recipeName && (
              <Link
                href={`/recipes/${item.primaryRecipeId}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <span>📖</span>
                <span>From: {recipeName}</span>
              </Link>
            )}
            {item.brand && !recipeName && (
              <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                {item.brand}
              </div>
            )}
          </div>

          {/* Expected price */}
          {item.expectedPriceCents && (
            <div className="text-sm font-medium text-foreground">
              ${(item.expectedPriceCents / 100).toFixed(2)}
            </div>
          )}
        </div>

        {/* Swipe hint for first-time users */}
        {!isSwiping && (
          <div className="absolute bottom-1 right-2 text-xs text-muted-foreground dark:text-muted-foreground">
            ← swipe →
          </div>
        )}
      </div>
    </div>
  )
}

function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    produce: '🥬',
    meat: '🥩',
    dairy: '🥛',
    bakery: '🥖',
    deli: '🧀',
    eggs: '🥚',
    herbs: '🌿',
    seafood: '🐟',
    frozen: '🧊',
    pantry: '🥫',
    beverages: '🥤',
    other: '🛒',
  }
  return emojiMap[category] || '🛒'
}
