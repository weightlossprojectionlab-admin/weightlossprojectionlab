/**
 * Purchase Learning - Smart suggestions based on purchase patterns
 *
 * Analyzes purchase history to suggest:
 * - Frequently bought together items
 * - Items "due to buy" based on average days between purchases
 */

import type { ShoppingItem } from '@/types/shopping'

export interface FrequentlyBoughtTogether {
  productName: string
  category: string
  coOccurrences: number
  confidence: number // 0-1
}

export interface DueToBuyItem {
  item: ShoppingItem
  daysSinceLastPurchase: number
  expectedDays: number
  confidence: 'low' | 'medium' | 'high'
}

/**
 * Find items frequently bought together with a given item
 * Analyzes last 30 days of purchase history
 */
export function findFrequentlyBoughtTogether(
  anchorItem: ShoppingItem,
  allItems: ShoppingItem[],
  minCoOccurrences = 2
): FrequentlyBoughtTogether[] {
  if (!anchorItem.purchaseHistory || anchorItem.purchaseHistory.length === 0) {
    return []
  }

  // Get purchase dates for anchor item
  const anchorPurchaseDates = anchorItem.purchaseHistory
    .map(p => new Date(p.date).toDateString())

  // Count co-occurrences with other items
  const coOccurrenceMap = new Map<string, { count: number; item: ShoppingItem }>()

  allItems.forEach(item => {
    if (item.id === anchorItem.id || !item.purchaseHistory) return

    // Count how many times this item was purchased on same days as anchor
    let coOccurrences = 0
    item.purchaseHistory.forEach(purchase => {
      const purchaseDate = new Date(purchase.date).toDateString()
      if (anchorPurchaseDates.includes(purchaseDate)) {
        coOccurrences++
      }
    })

    if (coOccurrences >= minCoOccurrences) {
      coOccurrenceMap.set(item.id, { count: coOccurrences, item })
    }
  })

  // Convert to array and calculate confidence
  const results: FrequentlyBoughtTogether[] = []
  coOccurrenceMap.forEach(({ count, item }) => {
    const confidence = Math.min(count / anchorPurchaseDates.length, 1.0)

    results.push({
      productName: item.productName,
      category: item.category,
      coOccurrences: count,
      confidence
    })
  })

  // Sort by co-occurrences (descending) and return top results
  return results
    .sort((a, b) => b.coOccurrences - a.coOccurrences)
    .slice(0, 5)
}

/**
 * Find items that are "due to buy" based on purchase patterns
 */
export function findDueToBuyItems(
  items: ShoppingItem[],
  gracePeriodDays = 2
): DueToBuyItem[] {
  const now = new Date()
  const results: DueToBuyItem[] = []

  items.forEach(item => {
    // Skip if already on shopping list
    if (item.needed) return

    // Need purchase history and average days between purchases
    if (!item.averageDaysBetweenPurchases || !item.lastPurchased) return

    // Calculate days since last purchase
    const daysSinceLastPurchase = Math.floor(
      (now.getTime() - new Date(item.lastPurchased).getTime()) / (1000 * 60 * 60 * 24)
    )

    const expectedDays = item.averageDaysBetweenPurchases

    // Check if due (with grace period)
    if (daysSinceLastPurchase >= expectedDays - gracePeriodDays) {
      let confidence: 'low' | 'medium' | 'high'

      // Calculate confidence based on purchase history consistency
      const purchaseCount = item.purchaseHistory?.length || 0

      if (purchaseCount >= 5) {
        confidence = 'high'
      } else if (purchaseCount >= 3) {
        confidence = 'medium'
      } else {
        confidence = 'low'
      }

      results.push({
        item,
        daysSinceLastPurchase,
        expectedDays,
        confidence
      })
    }
  })

  // Sort by how overdue (descending)
  return results.sort((a, b) => {
    const aOverdue = a.daysSinceLastPurchase - a.expectedDays
    const bOverdue = b.daysSinceLastPurchase - b.expectedDays
    return bOverdue - aOverdue
  })
}

/**
 * Calculate average days between purchases for an item
 * Call this after each purchase to update the average
 */
export function calculateAverageDaysBetweenPurchases(
  purchaseHistory: Array<{ date: Date }>
): number | undefined {
  if (purchaseHistory.length < 2) return undefined

  // Sort by date
  const sorted = [...purchaseHistory].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Calculate days between each consecutive purchase
  const daysBetween: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.floor(
      (new Date(sorted[i].date).getTime() - new Date(sorted[i-1].date).getTime()) /
      (1000 * 60 * 60 * 24)
    )
    daysBetween.push(days)
  }

  // Return average
  const sum = daysBetween.reduce((acc, days) => acc + days, 0)
  return Math.round(sum / daysBetween.length)
}
