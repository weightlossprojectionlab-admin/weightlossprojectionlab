'use client'

/**
 * Expiration Tracking and Alert Management
 *
 * Handles:
 * - Expiration date calculations
 * - Alert generation with severity levels
 * - Smart notifications for expiring items
 * - Learning user consumption patterns
 */

import type { ShoppingItem, ExpirationAlert } from '@/types/shopping'
import { formatExpirationDate } from './product-categories'

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiration(expiresAt: Date): number {
  const now = new Date()
  const diffTime = expiresAt.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Determine alert severity based on days until expiration
 */
export function getExpirationSeverity(
  daysUntil: number
): 'info' | 'warning' | 'critical' | 'expired' {
  if (daysUntil < 0) return 'expired'
  if (daysUntil === 0) return 'critical'
  if (daysUntil <= 2) return 'critical'
  if (daysUntil <= 5) return 'warning'
  return 'info'
}

/**
 * Create expiration alert from shopping item
 */
export function createExpirationAlert(item: ShoppingItem): ExpirationAlert | null {
  if (!item.expiresAt || !item.inStock) return null

  const daysUntil = getDaysUntilExpiration(item.expiresAt)
  const severity = getExpirationSeverity(daysUntil)

  return {
    itemId: item.id,
    productName: item.productName,
    expiresAt: item.expiresAt,
    daysUntilExpiration: daysUntil,
    severity,
    imageUrl: item.imageUrl
  }
}

/**
 * Get all expiration alerts from inventory
 */
export function getExpirationAlerts(
  items: ShoppingItem[],
  options: {
    includeExpired?: boolean
    daysAhead?: number
    sortBySeverity?: boolean
  } = {}
): ExpirationAlert[] {
  const {
    includeExpired = true,
    daysAhead = 7,
    sortBySeverity = true
  } = options

  const alerts: ExpirationAlert[] = items
    .filter(item => item.expiresAt && item.inStock)
    .map(item => createExpirationAlert(item))
    .filter((alert): alert is ExpirationAlert => {
      if (!alert) return false
      if (!includeExpired && alert.daysUntilExpiration < 0) return false
      if (alert.daysUntilExpiration > daysAhead) return false
      return true
    })

  if (sortBySeverity) {
    const severityOrder = { expired: 0, critical: 1, warning: 2, info: 3 }
    alerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityDiff !== 0) return severityDiff
      return a.daysUntilExpiration - b.daysUntilExpiration
    })
  }

  return alerts
}

/**
 * Get expiration summary statistics
 */
export function getExpirationSummary(items: ShoppingItem[]): {
  total: number
  expiring3Days: number
  expiring7Days: number
  expired: number
  critical: number
  warning: number
} {
  const now = new Date()

  const stats = {
    total: 0,
    expiring3Days: 0,
    expiring7Days: 0,
    expired: 0,
    critical: 0,
    warning: 0
  }

  items
    .filter(item => item.expiresAt && item.inStock)
    .forEach(item => {
      stats.total++

      const daysUntil = getDaysUntilExpiration(item.expiresAt!)
      const severity = getExpirationSeverity(daysUntil)

      if (daysUntil < 0) stats.expired++
      if (daysUntil <= 3 && daysUntil >= 0) stats.expiring3Days++
      if (daysUntil <= 7 && daysUntil >= 0) stats.expiring7Days++

      if (severity === 'critical') stats.critical++
      if (severity === 'warning') stats.warning++
    })

  return stats
}

/**
 * Learn typical shelf life from purchase history
 */
export function calculateTypicalShelfLife(item: ShoppingItem): number | undefined {
  if (!item.purchaseHistory || item.purchaseHistory.length < 2) return undefined

  const shelfLives: number[] = item.purchaseHistory
    .filter(entry => entry.expiresAt)
    .map(entry => {
      const purchaseDate = entry.date
      const expiration = entry.expiresAt!
      const diffTime = expiration.getTime() - purchaseDate.getTime()
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    })

  if (shelfLives.length === 0) return undefined

  // Calculate average shelf life
  const avgShelfLife = shelfLives.reduce((a, b) => a + b, 0) / shelfLives.length
  return Math.round(avgShelfLife)
}

/**
 * Calculate average days between purchases (consumption rate)
 */
export function calculateConsumptionRate(item: ShoppingItem): number | undefined {
  if (!item.purchaseHistory || item.purchaseHistory.length < 2) return undefined

  const sortedHistory = [...item.purchaseHistory].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )

  const intervals: number[] = []
  for (let i = 1; i < sortedHistory.length; i++) {
    const prevDate = sortedHistory[i - 1].date
    const currentDate = sortedHistory[i].date
    const diffTime = currentDate.getTime() - prevDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    intervals.push(diffDays)
  }

  if (intervals.length === 0) return undefined

  // Calculate average interval
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  return Math.round(avgInterval)
}

/**
 * Predict when item should be repurchased based on consumption pattern
 */
export function predictRepurchaseDate(item: ShoppingItem): Date | undefined {
  if (!item.lastPurchased) return undefined

  const consumptionRate = calculateConsumptionRate(item)
  if (!consumptionRate) return undefined

  const predictedDate = new Date(item.lastPurchased)
  predictedDate.setDate(predictedDate.getDate() + consumptionRate)

  return predictedDate
}

/**
 * Determine if item should be added to shopping list based on patterns
 */
export function shouldAutoAddToShoppingList(item: ShoppingItem): boolean {
  // If already needed, don't auto-add again
  if (item.needed) return false

  // If not in stock, should be on list
  if (!item.inStock) return true

  const predictedRepurchase = predictRepurchaseDate(item)
  if (!predictedRepurchase) return false

  // Auto-add 2 days before predicted repurchase
  const now = new Date()
  const daysUntilRepurchase = Math.ceil(
    (predictedRepurchase.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  return daysUntilRepurchase <= 2
}

/**
 * Get notification message for expiring item
 */
export function getExpirationNotificationMessage(alert: ExpirationAlert): {
  title: string
  body: string
  emoji: string
} {
  const { productName, daysUntilExpiration, severity } = alert

  switch (severity) {
    case 'expired':
      return {
        title: '🚨 Food Expired',
        body: `${productName} expired ${Math.abs(daysUntilExpiration)} day${Math.abs(daysUntilExpiration) !== 1 ? 's' : ''} ago`,
        emoji: '🚨'
      }

    case 'critical':
      if (daysUntilExpiration === 0) {
        return {
          title: '⚠️ Expires Today',
          body: `${productName} expires today! Use it soon.`,
          emoji: '⚠️'
        }
      }
      return {
        title: '⚠️ Expiring Soon',
        body: `${productName} expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}`,
        emoji: '⚠️'
      }

    case 'warning':
      return {
        title: '⏰ Reminder',
        body: `${productName} expires in ${daysUntilExpiration} days`,
        emoji: '⏰'
      }

    case 'info':
      return {
        title: '📋 Expiration Info',
        body: `${productName} expires in ${daysUntilExpiration} days`,
        emoji: '📋'
      }
  }
}

/**
 * Sort items by expiration priority
 */
export function sortByExpirationPriority(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => {
    // Items without expiration go to end
    if (!a.expiresAt && !b.expiresAt) return 0
    if (!a.expiresAt) return 1
    if (!b.expiresAt) return -1

    // Sort by expiration date
    return a.expiresAt.getTime() - b.expiresAt.getTime()
  })
}

/**
 * Check if item has expired
 */
export function isExpired(item: ShoppingItem): boolean {
  if (!item.expiresAt) return false
  return getDaysUntilExpiration(item.expiresAt) < 0
}

/**
 * Check if item is expiring soon (within 3 days)
 */
export function isExpiringSoon(item: ShoppingItem): boolean {
  if (!item.expiresAt) return false
  const daysUntil = getDaysUntilExpiration(item.expiresAt)
  return daysUntil >= 0 && daysUntil <= 3
}

/**
 * Get color for expiration severity (Tailwind classes)
 */
export function getExpirationColor(severity: 'info' | 'warning' | 'critical' | 'expired'): {
  bg: string
  text: string
  border: string
} {
  switch (severity) {
    case 'expired':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-900 dark:text-red-200',
        border: 'border-red-500 dark:border-red-700'
      }
    case 'critical':
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-900 dark:text-orange-200',
        border: 'border-orange-500 dark:border-orange-700'
      }
    case 'warning':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        text: 'text-yellow-900 dark:text-yellow-200',
        border: 'border-yellow-500 dark:border-yellow-700'
      }
    case 'info':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-900 dark:text-blue-200',
        border: 'border-blue-500 dark:border-blue-700'
      }
  }
}
