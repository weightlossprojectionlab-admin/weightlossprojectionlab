/**
 * Sync Manager - Background sync for offline-queued meals
 *
 * Processes queued meals and syncs them to Firebase when connection is restored.
 * Handles retries with exponential backoff for failed syncs.
 */

import { logger } from '@/lib/logger'
import { mealLogOperations } from './firebase-operations'
import {
  getUnsyncedMeals,
  markMealSynced,
  incrementSyncAttempt,
  deleteMeal,
  clearSyncedMeals,
  type QueuedMeal
} from './offline-queue'

const MAX_SYNC_ATTEMPTS = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 30000 // 30 seconds

export interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors: string[]
}

export interface SyncProgress {
  total: number
  completed: number
  current: string | null
}

// Global sync state (singleton)
let isSyncing = false
let syncProgressCallbacks: Array<(progress: SyncProgress) => void> = []

/**
 * Subscribe to sync progress updates
 */
export function onSyncProgress(callback: (progress: SyncProgress) => void): () => void {
  syncProgressCallbacks.push(callback)

  // Return unsubscribe function
  return () => {
    syncProgressCallbacks = syncProgressCallbacks.filter(cb => cb !== callback)
  }
}

/**
 * Notify all subscribers of sync progress
 */
function notifySyncProgress(progress: SyncProgress) {
  syncProgressCallbacks.forEach(callback => {
    try {
      callback(progress)
    } catch (error) {
      logger.error('[SyncManager] Error in progress callback', error as Error)
    }
  })
}

/**
 * Sync all queued meals to Firebase
 */
export async function syncQueue(): Promise<SyncResult> {
  // Prevent concurrent syncs
  if (isSyncing) {
    logger.debug('[SyncManager] Sync already in progress, skipping')
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: ['Sync already in progress']
    }
  }

  // Check online status
  if (!navigator.onLine) {
    logger.debug('[SyncManager] Offline, cannot sync')
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: ['Device is offline']
    }
  }

  isSyncing = true
  logger.info('[SyncManager] Starting sync...')

  try {
    const unsyncedMeals = await getUnsyncedMeals()

    if (unsyncedMeals.length === 0) {
      logger.debug('[SyncManager] No meals to sync')
      isSyncing = false
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        errors: []
      }
    }

    logger.info('[SyncManager] Found meals to sync', { count: unsyncedMeals.length })

    let syncedCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Process each meal sequentially
    for (let i = 0; i < unsyncedMeals.length; i++) {
      const meal = unsyncedMeals[i]

      notifySyncProgress({
        total: unsyncedMeals.length,
        completed: i,
        current: meal.mealData.mealType
      })

      try {
        await syncMeal(meal)
        await markMealSynced(meal.id)
        syncedCount++
        logger.debug('[SyncManager] Synced meal', { mealId: meal.id })
      } catch (error) {
        logger.error('[SyncManager] Failed to sync meal', error as Error, { mealId: meal.id })
        await incrementSyncAttempt(meal.id)
        failedCount++
        errors.push(`Failed to sync meal ${meal.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)

        // Delete meal if max attempts reached
        if (meal.syncAttempts >= MAX_SYNC_ATTEMPTS - 1) {
          logger.warn('[SyncManager] Max sync attempts reached, deleting meal', { mealId: meal.id })
          await deleteMeal(meal.id)
          errors.push(`Deleted meal ${meal.id} after ${MAX_SYNC_ATTEMPTS} failed attempts`)
        }
      }
    }

    // Final progress update
    notifySyncProgress({
      total: unsyncedMeals.length,
      completed: unsyncedMeals.length,
      current: null
    })

    // Clean up synced meals periodically
    const clearedCount = await clearSyncedMeals()
    logger.debug('[SyncManager] Cleared synced meals', { count: clearedCount })

    logger.info('[SyncManager] Sync complete', { syncedCount, failedCount })

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      errors
    }
  } catch (error) {
    logger.error('[SyncManager] Sync failed', error as Error)
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  } finally {
    isSyncing = false
  }
}

/**
 * Sync a single meal to Firebase
 * UPDATED: Uses patient-scoped data for caregiver support
 */
async function syncMeal(queuedMeal: QueuedMeal): Promise<void> {
  const { mealData, patientId, ownerUserId, loggedBy } = queuedMeal

  // Calculate retry delay with exponential backoff
  const retryDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, queuedMeal.syncAttempts),
    MAX_RETRY_DELAY
  )

  // Wait before retry if this is not the first attempt
  if (queuedMeal.syncAttempts > 0) {
    logger.debug('[SyncManager] Waiting before retry', { retryDelayMs: retryDelay })
    await new Promise(resolve => setTimeout(resolve, retryDelay))
  }

  try {
    // UPDATED: Use patient-scoped API endpoint
    // API will verify caregiver has permission via RBAC
    const response = await fetch(`/api/patients/${patientId}/meal-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}` // Get caregiver's auth token
      },
      body: JSON.stringify({
        mealType: mealData.mealType,
        photoUrl: undefined, // Skip photo upload for queued meals (save bandwidth)
        aiAnalysis: mealData.aiAnalysis,
        loggedAt: mealData.loggedAt,
        notes: mealData.notes,
        loggedBy // Track who logged it
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create meal log')
    }

    const result = await response.json()
    logger.debug('[SyncManager] Meal synced successfully', {
      mealLogId: result.data?.id,
      patientId,
      loggedBy
    })
  } catch (error) {
    logger.error('[SyncManager] Error syncing meal', error as Error, { patientId, loggedBy })
    throw error
  }
}

/**
 * Get authentication token for API calls
 */
async function getAuthToken(): Promise<string> {
  // Get Firebase auth token (caregiver's token)
  const { auth } = await import('@/lib/firebase')
  const token = await auth.currentUser?.getIdToken()
  if (!token) {
    throw new Error('No authentication token available')
  }
  return token
}

/**
 * Check if sync is currently in progress
 */
export function isSyncInProgress(): boolean {
  return isSyncing
}

/**
 * Register background sync (if supported)
 */
export async function registerBackgroundSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
    logger.warn('[SyncManager] Background Sync API not supported')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.sync.register('sync-meal-queue')
    logger.info('[SyncManager] Background sync registered')
    return true
  } catch (error) {
    logger.error('[SyncManager] Failed to register background sync', error as Error)
    return false
  }
}
