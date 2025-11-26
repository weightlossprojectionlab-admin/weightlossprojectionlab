'use client'

/**
 * Share List Button
 *
 * Export shopping list as text for sharing via SMS/email/messaging apps
 */

import { useState } from 'react'
import { ShareIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { ShoppingItem } from '@/types/shopping'

interface NavigatorWithShare extends Navigator {
  share(data?: ShareData): Promise<void>
}

function hasShareAPI(nav: Navigator): nav is NavigatorWithShare {
  return 'share' in nav && typeof (nav as any).share === 'function'
}

interface ShareListButtonProps {
  items: ShoppingItem[]
  storeName?: string
  className?: string
}

export function ShareListButton({
  items,
  storeName,
  className = '',
}: ShareListButtonProps) {
  const [copied, setCopied] = useState(false)

  const generateShoppingListText = (): string => {
    if (items.length === 0) {
      return 'Shopping list is empty'
    }

    let text = storeName
      ? `🛒 Shopping List - ${storeName}\n\n`
      : '🛒 Shopping List\n\n'

    // Group by category
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    }, {} as Record<string, ShoppingItem[]>)

    // Format each category
    Object.entries(grouped).forEach(([category, categoryItems]) => {
      text += `${getCategoryEmoji(category)} ${formatCategoryName(category)}\n`
      categoryItems.forEach(item => {
        const quantity = item.displayQuantity || `${item.quantity} ${item.unit || ''}`
        text += `  ☐ ${item.productName}`
        if (quantity) {
          text += ` (${quantity})`
        }
        if (item.priority === 'high') {
          text += ' ⚡'
        }
        text += '\n'
      })
      text += '\n'
    })

    text += `Total items: ${items.length}\n`
    text += `\nShared from Weight Loss Projection Lab 💪`

    return text
  }

  const handleShare = async () => {
    const text = generateShoppingListText()

    // Try native Web Share API first (mobile)
    if (hasShareAPI(navigator)) {
      try {
        await navigator.share({
          title: storeName ? `Shopping List - ${storeName}` : 'Shopping List',
          text: text,
        })
        toast.success('List shared!')
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          // Fallback to clipboard
          await copyToClipboard(text)
        }
      }
    } else {
      // Fallback to clipboard for desktop
      await copyToClipboard(text)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Shopping list copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  if (items.length === 0) {
    return null
  }

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 px-4 py-2 bg-background border border-border dark:border-gray-600 rounded-lg hover:bg-background transition-colors ${className}`}
      aria-label="Share shopping list"
    >
      {copied ? (
        <>
          <CheckIcon className="h-5 w-5 text-success dark:text-green-400" />
          <span className="text-sm font-medium text-success dark:text-green-400">
            Copied!
          </span>
        </>
      ) : (
        <>
          {hasShareAPI(navigator) ? (
            <ShareIcon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ClipboardDocumentIcon className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">
            Share List
          </span>
        </>
      )}
    </button>
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

function formatCategoryName(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}
