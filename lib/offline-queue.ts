/**
 * Offline Queue - IndexedDB-backed meal logging queue
 *
 * Stores meal logs when offline and syncs them when connection is restored.
 * Uses IndexedDB for persistent storage across page reloads.
 */

import type { AIAnalysis } from '@/types'

const DB_NAME = 'wlpl-offline-queue'
const DB_VERSION = 1
const STORE_NAME = 'meal-queue'

export interface QueuedMeal {
  id: string // UUID
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

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        objectStore.createIndex('synced', 'synced', { unique: false })
        objectStore.createIndex('queuedAt', 'queuedAt', { unique: false })
      }
    }
  })
}

/**
 * Queue a meal for offline sync
 */
export async function queueMeal(mealData: QueuedMeal['mealData']): Promise<string> {
  const db = await openDB()

  const queuedMeal: QueuedMeal = {
    id: crypto.randomUUID(),
    mealData,
    queuedAt: Date.now(),
    synced: false,
    syncAttempts: 0
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add(queuedMeal)

    request.onsuccess = () => {
      console.log('[OfflineQueue] Meal queued:', queuedMeal.id)
      resolve(queuedMeal.id)
    }

    request.onerror = () => {
      console.error('[OfflineQueue] Failed to queue meal:', request.error)
      reject(new Error('Failed to queue meal'))
    }
  })
}

/**
 * Get all unsynced meals from queue
 */
export async function getUnsyncedMeals(): Promise<QueuedMeal[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('synced')
    const request = index.getAll(false) // Get all where synced = false

    request.onsuccess = () => {
      const meals = request.result as QueuedMeal[]
      console.log('[OfflineQueue] Unsynced meals:', meals.length)
      resolve(meals)
    }

    request.onerror = () => {
      console.error('[OfflineQueue] Failed to get unsynced meals:', request.error)
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
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const meal = getRequest.result as QueuedMeal | undefined

      if (meal) {
        meal.synced = true
        const updateRequest = store.put(meal)

        updateRequest.onsuccess = () => {
          console.log('[OfflineQueue] Meal marked as synced:', id)
          resolve()
        }

        updateRequest.onerror = () => {
          console.error('[OfflineQueue] Failed to update meal:', updateRequest.error)
          reject(new Error('Failed to mark meal as synced'))
        }
      } else {
        reject(new Error(`Meal not found: ${id}`))
      }
    }

    getRequest.onerror = () => {
      console.error('[OfflineQueue] Failed to get meal:', getRequest.error)
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
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const meal = getRequest.result as QueuedMeal | undefined

      if (meal) {
        meal.syncAttempts += 1
        meal.lastSyncAttempt = Date.now()
        const updateRequest = store.put(meal)

        updateRequest.onsuccess = () => {
          console.log('[OfflineQueue] Sync attempt incremented:', id, 'attempts:', meal.syncAttempts)
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
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => {
      console.log('[OfflineQueue] Meal deleted:', id)
      resolve()
    }

    request.onerror = () => {
      console.error('[OfflineQueue] Failed to delete meal:', request.error)
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
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('synced')
    const request = index.getAll(true) // Get all synced meals

    request.onsuccess = () => {
      const meals = request.result as QueuedMeal[]
      let deletedCount = 0

      meals.forEach(meal => {
        store.delete(meal.id)
        deletedCount++
      })

      transaction.oncomplete = () => {
        console.log('[OfflineQueue] Cleared synced meals:', deletedCount)
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
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const countRequest = store.count()

    countRequest.onsuccess = () => {
      const total = countRequest.result

      const index = store.index('synced')
      const unsyncedRequest = index.count(false)

      unsyncedRequest.onsuccess = () => {
        const unsynced = unsyncedRequest.result
        const synced = total - unsynced

        resolve({ total, unsynced, synced })
      }

      unsyncedRequest.onerror = () => {
        reject(new Error('Failed to count unsynced meals'))
      }
    }

    countRequest.onerror = () => {
      reject(new Error('Failed to count meals'))
    }
  })
}
