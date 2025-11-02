'use client'

import { useState, useEffect } from 'react'
import { syncQueue, onSyncProgress, isSyncInProgress, registerBackgroundSync, type SyncProgress } from '@/lib/sync-manager'
import { getQueueStats } from '@/lib/offline-queue'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

export interface OnlineStatus {
  isOnline: boolean
  isSyncing: boolean
  queuedCount: number
  syncProgress: SyncProgress | null
}

/**
 * Hook to track online/offline status and sync queue state
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [queuedCount, setQueuedCount] = useState(0)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)

  // Initialize online status
  useEffect(() => {
    setIsOnline(navigator.onLine)

    // Register background sync on mount
    registerBackgroundSync().catch(err => logger.error('Failed to register background sync', err))

    // Update queued count
    getQueueStats()
      .then(stats => setQueuedCount(stats.unsynced))
      .catch(err => logger.error('Failed to get queue stats', err))
  }, [])

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      logger.debug('[OnlineStatus] Connection restored')
      setIsOnline(true)

      // Check if there are queued meals
      try {
        const stats = await getQueueStats()
        if (stats.unsynced > 0) {
          toast.success(`Back online! Syncing ${stats.unsynced} queued meal${stats.unsynced > 1 ? 's' : ''}...`)

          // Start sync
          setIsSyncing(true)
          const result = await syncQueue()

          if (result.success) {
            toast.success(`Successfully synced ${result.syncedCount} meal${result.syncedCount > 1 ? 's' : ''}!`)
            setQueuedCount(0)
          } else {
            toast.error(`Sync completed with ${result.failedCount} error${result.failedCount > 1 ? 's' : ''}`)
            setQueuedCount(result.failedCount)
          }

          setIsSyncing(false)
          setSyncProgress(null)
        }
      } catch (error) {
        logger.error('[OnlineStatus] Sync error:', error as Error)
        toast.error('Sync failed. Will retry automatically.')
        setIsSyncing(false)
        setSyncProgress(null)
      }
    }

    const handleOffline = () => {
      logger.debug('[OnlineStatus] Connection lost')
      setIsOnline(false)
      toast.error('You are offline. Meals will be queued for later sync.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Subscribe to sync progress
  useEffect(() => {
    const unsubscribe = onSyncProgress((progress) => {
      setSyncProgress(progress)
      setIsSyncing(progress.completed < progress.total)
    })

    return unsubscribe
  }, [])

  // Listen for service worker sync messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = async (event: MessageEvent) => {
        if (event.data && event.data.type === 'SYNC_QUEUE') {
          logger.debug('[OnlineStatus] Received sync message from service worker')

          // Start sync if not already syncing
          if (!isSyncInProgress()) {
            setIsSyncing(true)
            try {
              const result = await syncQueue()
              if (result.success) {
                setQueuedCount(0)
                toast.success(`Synced ${result.syncedCount} queued meals!`)
              } else {
                setQueuedCount(result.failedCount)
              }
            } catch (error) {
              logger.error('[OnlineStatus] Sync error:', error as Error)
            } finally {
              setIsSyncing(false)
              setSyncProgress(null)
            }
          }
        }
      }

      navigator.serviceWorker.addEventListener('message', handleMessage)

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
    }
  }, [])

  return {
    isOnline,
    isSyncing,
    queuedCount,
    syncProgress
  }
}
