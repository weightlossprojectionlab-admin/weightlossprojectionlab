'use client'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

/**
 * Sync Status Widget
 *
 * Shows sync status and pending queue count
 * Appears in navigation or floating action button
 */
export function SyncStatusWidget() {
  const { isOnline, isSyncing, queuedCount, syncProgress } = useOnlineStatus()

  // Only show if offline or has queued items
  if (isOnline && queuedCount === 0 && !isSyncing) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 max-w-xs">
        <div className="flex items-start space-x-3">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {isSyncing ? (
              <ArrowPathIcon className="h-6 w-6 text-primary animate-spin" />
            ) : isOnline ? (
              <CheckCircleIcon className="h-6 w-6 text-success" />
            ) : (
              <ExclamationTriangleIcon className="h-6 w-6 text-warning-dark" />
            )}
          </div>

          {/* Status Text */}
          <div className="flex-1 min-w-0">
            {isSyncing && syncProgress ? (
              <div>
                <p className="text-sm font-medium text-foreground">
                  Syncing data...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {syncProgress.completed} / {syncProgress.total} items
                  {syncProgress.current && ` • ${syncProgress.current}`}
                </p>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(syncProgress.completed / syncProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ) : queuedCount > 0 ? (
              <div>
                <p className="text-sm font-medium text-foreground">
                  {queuedCount} item{queuedCount > 1 ? 's' : ''} queued
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isOnline ? 'Syncing when possible...' : 'Will sync when online'}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-foreground">
                  All synced
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Up to date
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
