/**
 * Sync Manager - Background sync for offline-queued meals
 *
 * Processes queued meals and syncs them to Firebase when connection is restored.
 * Handles retries with exponential backoff for failed syncs.
 */

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
      console.error('[SyncManager] Error in progress callback:', error)
    }
  })
}

/**
 * Sync all queued meals to Firebase
 */
export async function syncQueue(): Promise<SyncResult> {
  // Prevent concurrent syncs
  if (isSyncing) {
    console.log('[SyncManager] Sync already in progress, skipping')
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: ['Sync already in progress']
    }
  }

  // Check online status
  if (!navigator.onLine) {
    console.log('[SyncManager] Offline, cannot sync')
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: ['Device is offline']
    }
  }

  isSyncing = true
  console.log('[SyncManager] Starting sync...')

  try {
    const unsyncedMeals = await getUnsyncedMeals()

    if (unsyncedMeals.length === 0) {
      console.log('[SyncManager] No meals to sync')
      isSyncing = false
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        errors: []
      }
    }

    console.log('[SyncManager] Found', unsyncedMeals.length, 'meals to sync')

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
        console.log('[SyncManager] Synced meal:', meal.id)
      } catch (error) {
        console.error('[SyncManager] Failed to sync meal:', meal.id, error)
        await incrementSyncAttempt(meal.id)
        failedCount++
        errors.push(`Failed to sync meal ${meal.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)

        // Delete meal if max attempts reached
        if (meal.syncAttempts >= MAX_SYNC_ATTEMPTS - 1) {
          console.warn('[SyncManager] Max sync attempts reached, deleting meal:', meal.id)
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
    console.log('[SyncManager] Cleared', clearedCount, 'synced meals')

    console.log('[SyncManager] Sync complete:', syncedCount, 'synced,', failedCount, 'failed')

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      errors
    }
  } catch (error) {
    console.error('[SyncManager] Sync failed:', error)
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
 */
async function syncMeal(queuedMeal: QueuedMeal): Promise<void> {
  const { mealData } = queuedMeal

  // Calculate retry delay with exponential backoff
  const retryDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, queuedMeal.syncAttempts),
    MAX_RETRY_DELAY
  )

  // Wait before retry if this is not the first attempt
  if (queuedMeal.syncAttempts > 0) {
    console.log('[SyncManager] Waiting', retryDelay, 'ms before retry')
    await new Promise(resolve => setTimeout(resolve, retryDelay))
  }

  try {
    // Note: photoDataUrl is NOT uploaded for queued meals to save bandwidth
    // Users can take photos when back online
    const response = await mealLogOperations.createMealLog({
      mealType: mealData.mealType,
      photoUrl: undefined, // Skip photo upload for queued meals
      aiAnalysis: mealData.aiAnalysis,
      loggedAt: mealData.loggedAt,
      notes: mealData.notes
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to create meal log')
    }

    console.log('[SyncManager] Meal synced successfully:', response.data?.id)
  } catch (error) {
    console.error('[SyncManager] Error syncing meal:', error)
    throw error
  }
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
    console.warn('[SyncManager] Background Sync API not supported')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.sync.register('sync-meal-queue')
    console.log('[SyncManager] Background sync registered')
    return true
  } catch (error) {
    console.error('[SyncManager] Failed to register background sync:', error)
    return false
  }
}
