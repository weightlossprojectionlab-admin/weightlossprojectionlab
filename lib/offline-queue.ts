/**
 * Offline Queue - IndexedDB-backed meal logging queue
 *
 * Stores meal logs when offline and syncs them when connection is restored.
 * Uses IndexedDB for persistent storage across page reloads.
 */

import { logger } from '@/lib/logger'
import type { AIAnalysis } from '@/types'

const DB_NAME = 'wlpl-offline-queue'
const DB_VERSION = 3 // Incremented for patient-scoped queues
const MEAL_STORE_NAME = 'meal-queue'
const WEIGHT_STORE_NAME = 'weight-queue'

export interface QueuedMeal {
  id: string // UUID
  type: 'meal'
  patientId: string // ADDED: Which patient this meal belongs to
  ownerUserId: string // ADDED: Patient's owner (for sync target)
  loggedBy: string // ADDED: Who logged it (caregiver userId)
  mealData: {
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    photoDataUrl?: string // Base64 data URL
    aiAnalysis?: AIAnalysis
    loggedAt: string // ISO string
    notes?: string
  }
  queuedAt: number // timestamp
  synced: boolean
  syncAttempts: number
  lastSyncAttempt?: number
}

export interface QueuedWeight {
  id: string // UUID
  type: 'weight'
  patientId: string // ADDED: Which patient this weight belongs to
  ownerUserId: string // ADDED: Patient's owner (for sync target)
  loggedBy: string // ADDED: Who logged it (caregiver userId)
  weightData: {
    weight: number
    date: string // ISO string
    notes?: string
  }
  queuedAt: number // timestamp
  synced: boolean
  syncAttempts: number
  lastSyncAttempt?: number
}

export type QueuedItem = QueuedMeal | QueuedWeight

/**
 * Initialize IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create meal queue object store if it doesn't exist
      if (!db.objectStoreNames.contains(MEAL_STORE_NAME)) {
        const mealStore = db.createObjectStore(MEAL_STORE_NAME, { keyPath: 'id' })
        mealStore.createIndex('synced', 'synced', { unique: false })
        mealStore.createIndex('queuedAt', 'queuedAt', { unique: false })
        mealStore.createIndex('patientId', 'patientId', { unique: false }) // ADDED
        mealStore.createIndex('loggedBy', 'loggedBy', { unique: false }) // ADDED
      }

      // Create weight queue object store if it doesn't exist
      if (!db.objectStoreNames.contains(WEIGHT_STORE_NAME)) {
        const weightStore = db.createObjectStore(WEIGHT_STORE_NAME, { keyPath: 'id' })
        weightStore.createIndex('synced', 'synced', { unique: false })
        weightStore.createIndex('queuedAt', 'queuedAt', { unique: false })
        weightStore.createIndex('patientId', 'patientId', { unique: false }) // ADDED
        weightStore.createIndex('loggedBy', 'loggedBy', { unique: false }) // ADDED
      }
    }
  })
}

/**
 * Queue a meal for offline sync
 * UPDATED: Now requires patient context for caregiver support
 */
export async function queueMeal(
  mealData: QueuedMeal['mealData'],
  patientId: string,
  ownerUserId: string,
  loggedBy: string
): Promise<string> {
  const db = await openDB()

  const queuedMeal: QueuedMeal = {
    id: crypto.randomUUID(),
    type: 'meal',
    patientId, // ADDED
    ownerUserId, // ADDED
    loggedBy, // ADDED
    mealData,
    queuedAt: Date.now(),
    synced: false,
    syncAttempts: 0
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MEAL_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(MEAL_STORE_NAME)
    const request = store.add(queuedMeal)

    request.onsuccess = () => {
      logger.debug('[OfflineQueue] Meal queued', { mealId: queuedMeal.id })
      resolve(queuedMeal.id)
    }

    request.onerror = () => {
      logger.error('[OfflineQueue] Failed to queue meal', request.error as Error)
      reject(new Error('Failed to queue meal'))
    }
  })
}

/**
 * Queue a weight entry for offline sync
 * UPDATED: Now requires patient context for caregiver support
 */
export async function queueWeight(
  weightData: QueuedWeight['weightData'],
  patientId: string,
  ownerUserId: string,
  loggedBy: string
): Promise<string> {
  const db = await openDB()

  const queuedWeight: QueuedWeight = {
    id: crypto.randomUUID(),
    type: 'weight',
    patientId, // ADDED
    ownerUserId, // ADDED
    loggedBy, // ADDED
    weightData,
    queuedAt: Date.now(),
    synced: false,
    syncAttempts: 0
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WEIGHT_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(WEIGHT_STORE_NAME)
    const request = store.add(queuedWeight)

    request.onsuccess = () => {
      logger.debug('[OfflineQueue] Weight queued', { weightId: queuedWeight.id })
      resolve(queuedWeight.id)
    }

    request.onerror = () => {
      logger.error('[OfflineQueue] Failed to queue weight', request.error as Error)
      reject(new Error('Failed to queue weight'))
    }
  })
}

/**
 * Get all unsynced meals from queue
 */
export async function getUnsyncedMeals(): Promise<QueuedMeal[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MEAL_STORE_NAME], 'readonly')
    const store = transaction.objectStore(MEAL_STORE_NAME)
    // Get all meals and filter client-side (IndexedDB doesn't reliably support boolean in IDBKeyRange)
    const request = store.getAll()

    request.onsuccess = () => {
      const allMeals = request.result as QueuedMeal[]
      const unsyncedMeals = allMeals.filter(meal => meal.synced === false)
      logger.debug('[OfflineQueue] Unsynced meals', { count: unsyncedMeals.length })
      resolve(unsyncedMeals)
    }

    request.onerror = () => {
      logger.error('[OfflineQueue] Failed to get unsynced meals', request.error as Error)
      reject(new Error('Failed to get unsynced meals'))
    }
  })
}

/**
 * Mark a meal as synced
 */
export async function markMealSynced(id: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MEAL_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(MEAL_STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const meal = getRequest.result as QueuedMeal | undefined

      if (meal) {
        meal.synced = true
        const updateRequest = store.put(meal)

        updateRequest.onsuccess = () => {
          logger.debug('[OfflineQueue] Meal marked as synced', { mealId: id })
          resolve()
        }

        updateRequest.onerror = () => {
          logger.error('[OfflineQueue] Failed to update meal', updateRequest.error as Error)
          reject(new Error('Failed to mark meal as synced'))
        }
      } else {
        reject(new Error(`Meal not found: ${id}`))
      }
    }

    getRequest.onerror = () => {
      logger.error('[OfflineQueue] Failed to get meal', getRequest.error as Error)
      reject(new Error('Failed to get meal'))
    }
  })
}

/**
 * Increment sync attempt count for a meal
 */
export async function incrementSyncAttempt(id: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MEAL_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(MEAL_STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const meal = getRequest.result as QueuedMeal | undefined

      if (meal) {
        meal.syncAttempts += 1
        meal.lastSyncAttempt = Date.now()
        const updateRequest = store.put(meal)

        updateRequest.onsuccess = () => {
          logger.debug('[OfflineQueue] Sync attempt incremented', { mealId: id, attempts: meal.syncAttempts })
          resolve()
        }

        updateRequest.onerror = () => {
          reject(new Error('Failed to increment sync attempt'))
        }
      } else {
        reject(new Error(`Meal not found: ${id}`))
      }
    }

    getRequest.onerror = () => {
      reject(new Error('Failed to get meal'))
    }
  })
}

/**
 * Delete a meal from the queue
 */
export async function deleteMeal(id: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MEAL_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(MEAL_STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => {
      logger.debug('[OfflineQueue] Meal deleted', { mealId: id })
      resolve()
    }

    request.onerror = () => {
      logger.error('[OfflineQueue] Failed to delete meal', request.error as Error)
      reject(new Error('Failed to delete meal'))
    }
  })
}

/**
 * Clear all synced meals from queue
 */
export async function clearSyncedMeals(): Promise<number> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MEAL_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(MEAL_STORE_NAME)
    // Get all meals and filter client-side (IndexedDB doesn't reliably support boolean in IDBKeyRange)
    const request = store.getAll()

    request.onsuccess = () => {
      const allMeals = request.result as QueuedMeal[]
      const syncedMeals = allMeals.filter(meal => meal.synced === true)
      let deletedCount = 0

      syncedMeals.forEach(meal => {
        store.delete(meal.id)
        deletedCount++
      })

      transaction.oncomplete = () => {
        logger.debug('[OfflineQueue] Cleared synced meals', { count: deletedCount })
        resolve(deletedCount)
      }

      transaction.onerror = () => {
        reject(new Error('Failed to clear synced meals'))
      }
    }

    request.onerror = () => {
      reject(new Error('Failed to get synced meals'))
    }
  })
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number
  unsynced: number
  synced: number
}> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MEAL_STORE_NAME], 'readonly')
    const store = transaction.objectStore(MEAL_STORE_NAME)
    // Get all meals and count client-side (IndexedDB doesn't reliably support boolean in IDBKeyRange)
    const request = store.getAll()

    request.onsuccess = () => {
      const allMeals = request.result as QueuedMeal[]
      const total = allMeals.length
      const unsynced = allMeals.filter(meal => meal.synced === false).length
      const synced = allMeals.filter(meal => meal.synced === true).length

      resolve({ total, unsynced, synced })
    }

    request.onerror = () => {
      reject(new Error('Failed to get queue stats'))
    }
  })
}
