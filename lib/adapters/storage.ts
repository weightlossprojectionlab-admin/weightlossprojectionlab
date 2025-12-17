/**
 * Storage Adapter
 *
 * Provides a unified storage interface that works across web and native platforms.
 * - Web: Uses localStorage (synchronous)
 * - Native: Uses Capacitor Preferences (asynchronous)
 *
 * This adapter ensures seamless data persistence regardless of the platform.
 */

import { Preferences } from '@capacitor/preferences'
import { isNative, isServer } from '@/lib/platform'

/**
 * Storage interface with both sync and async methods
 */
export interface StorageAdapter {
  // Async methods (work everywhere)
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>

  // Sync methods (web-only, throws on native)
  getItemSync(key: string): string | null
  setItemSync(key: string, value: string): void
  removeItemSync(key: string): void
}

class WebStorageAdapter implements StorageAdapter {
  // Async methods
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key)
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value)
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  async clear(): Promise<void> {
    localStorage.clear()
  }

  async keys(): Promise<string[]> {
    return Object.keys(localStorage)
  }

  // Sync methods (direct passthrough)
  getItemSync(key: string): string | null {
    return localStorage.getItem(key)
  }

  setItemSync(key: string, value: string): void {
    localStorage.setItem(key, value)
  }

  removeItemSync(key: string): void {
    localStorage.removeItem(key)
  }
}

class NativeStorageAdapter implements StorageAdapter {
  // Async methods
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key })
    return value
  }

  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value })
  }

  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key })
  }

  async clear(): Promise<void> {
    await Preferences.clear()
  }

  async keys(): Promise<string[]> {
    const { keys } = await Preferences.keys()
    return keys
  }

  // Sync methods (throw error on native)
  getItemSync(key: string): string | null {
    throw new Error('Sync storage operations not supported on native platforms. Use getItem() instead.')
  }

  setItemSync(key: string, value: string): void {
    throw new Error('Sync storage operations not supported on native platforms. Use setItem() instead.')
  }

  removeItemSync(key: string): void {
    throw new Error('Sync storage operations not supported on native platforms. Use removeItem() instead.')
  }
}

class ServerStorageAdapter implements StorageAdapter {
  // All methods no-op on server
  async getItem(key: string): Promise<string | null> {
    return null
  }

  async setItem(key: string, value: string): Promise<void> {
    // No-op
  }

  async removeItem(key: string): Promise<void> {
    // No-op
  }

  async clear(): Promise<void> {
    // No-op
  }

  async keys(): Promise<string[]> {
    return []
  }

  getItemSync(key: string): string | null {
    return null
  }

  setItemSync(key: string, value: string): void {
    // No-op
  }

  removeItemSync(key: string): void {
    // No-op
  }
}

/**
 * Get the appropriate storage adapter for the current platform
 */
function getStorageAdapter(): StorageAdapter {
  if (isServer()) {
    return new ServerStorageAdapter()
  }

  if (isNative()) {
    return new NativeStorageAdapter()
  }

  return new WebStorageAdapter()
}

// Export singleton instance
export const storage = getStorageAdapter()

/**
 * Utility: Get and parse JSON from storage
 */
export async function getJSON<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const value = await storage.getItem(key)
    return value ? JSON.parse(value) : defaultValue
  } catch (error) {
    console.error(`Failed to parse JSON from storage key "${key}":`, error)
    return defaultValue
  }
}

/**
 * Utility: Set JSON to storage
 */
export async function setJSON<T>(key: string, value: T): Promise<void> {
  try {
    await storage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to set JSON to storage key "${key}":`, error)
    throw error
  }
}

/**
 * Utility: Migrate localStorage data to Capacitor Preferences (one-time migration)
 *
 * Call this during app initialization to migrate existing localStorage data
 * to Capacitor Preferences on first native app launch.
 */
export async function migrateLocalStorageToPreferences(): Promise<void> {
  if (!isNative() || isServer()) {
    return // Only run on native platforms
  }

  const MIGRATION_KEY = '_storage_migrated_v1'

  // Check if migration already completed
  const migrated = await storage.getItem(MIGRATION_KEY)
  if (migrated === 'true') {
    console.log('Storage migration already completed')
    return
  }

  console.log('Starting localStorage → Preferences migration...')

  try {
    // Get all keys from localStorage (if it exists from WebView)
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage)
      let migratedCount = 0

      for (const key of keys) {
        const value = localStorage.getItem(key)
        if (value !== null) {
          await storage.setItem(key, value)
          migratedCount++
        }
      }

      console.log(`Migrated ${migratedCount} keys from localStorage to Preferences`)
    }

    // Mark migration as complete
    await storage.setItem(MIGRATION_KEY, 'true')
    console.log('Storage migration completed successfully')
  } catch (error) {
    console.error('Storage migration failed:', error)
    // Don't throw - allow app to continue even if migration fails
  }
}
