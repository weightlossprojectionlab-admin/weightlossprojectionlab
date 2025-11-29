'use client'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

/**
 * Offline Banner Component
 *
 * Shows when user is offline and viewing cached data
 * Critical for medical/shopping scenarios
 */
export function OfflineBanner() {
  const { isOnline, isSyncing, queuedCount } = useOnlineStatus()
  const [dismissed, setDismissed] = useState(false)

  // Don't show if online or dismissed
  if (isOnline || dismissed) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-warning-light border-b-2 border-warning-dark">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Offline Indicator Dot */}
            <div className="flex-shrink-0">
              <div className="h-3 w-3 rounded-full bg-warning-dark animate-pulse"></div>
            </div>

            {/* Message */}
            <div className="flex-1">
              <p className="text-sm font-medium text-warning-dark">
                You're offline. Viewing cached data
                {queuedCount > 0 && ` • ${queuedCount} action${queuedCount > 1 ? 's' : ''} queued for sync`}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-600 mt-0.5">
                Medical data, shopping lists, and scanned items will sync automatically when you're back online
              </p>
            </div>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 ml-3 p-1 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
            aria-label="Dismiss"
          >
            <XMarkIcon className="h-5 w-5 text-warning-dark" />
          </button>
        </div>
      </div>
    </div>
  )
}
