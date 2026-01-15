'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

/**
 * UpdateChecker Component
 *
 * Listens for service worker updates and prompts user to refresh
 * when a new version is available.
 */
export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    // Check if service workers are supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // Listen for service worker updates
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('[UpdateChecker] New version detected:', event.data.version)
        setUpdateAvailable(true)

        // Show toast notification
        toast(
          (t) => (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold">Update Available!</p>
                <p className="text-sm text-muted-foreground">
                  A new version of the app is ready.
                </p>
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  window.location.reload()
                }}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                Refresh
              </button>
            </div>
          ),
          {
            duration: Infinity,
            position: 'bottom-center',
          }
        )
      }
    }

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)

    // Check for updates periodically
    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          await registration.update()
        }
      } catch (error) {
        console.error('[UpdateChecker] Error checking for updates:', error)
      }
    }

    // Check for updates every 5 minutes
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000)

    // Check immediately on mount
    checkForUpdates()

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      clearInterval(interval)
    }
  }, [])

  return null // This component doesn't render anything
}
