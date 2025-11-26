'use client'

import { memo } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export const OfflineIndicator = memo(function OfflineIndicator() {
  const { isOnline, isSyncing, queuedCount, syncProgress } = useOnlineStatus()

  // Don't show anything if online and not syncing
  if (isOnline && !isSyncing && queuedCount === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {/* Offline Badge */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 mb-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
          <div className="flex-1">
            <p className="font-medium text-sm">You're Offline</p>
            {queuedCount > 0 && (
              <p className="text-xs opacity-90">
                {queuedCount} meal{queuedCount !== 1 ? 's' : ''} queued for sync
              </p>
            )}
          </div>
        </div>
      )}

      {/* Syncing Badge */}
      {isSyncing && syncProgress && (
        <div className="bg-primary text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2 mb-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            <p className="font-medium text-sm">Syncing Meals...</p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-primary-light dark:bg-purple-900/20 rounded-full h-1.5 mb-1">
            <div
              className="bg-background dark:bg-gray-300 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${(syncProgress.completed / syncProgress.total) * 100}%`
              }}
            />
          </div>

          <p className="text-xs opacity-90">
            {syncProgress.completed} of {syncProgress.total} meals
            {syncProgress.current && ` • ${syncProgress.current}`}
          </p>
        </div>
      )}

      {/* Queued Badge (when online but have queued items) */}
      {isOnline && !isSyncing && queuedCount > 0 && (
        <div className="bg-secondary-light0 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-medium text-sm">{queuedCount} Pending</p>
            <p className="text-xs opacity-90">Will sync automatically</p>
          </div>
        </div>
      )}
    </div>
  )
})

