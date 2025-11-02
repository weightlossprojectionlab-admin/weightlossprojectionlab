'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    // Only run in production and if service workers are supported
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          logger.debug('[SW] Registered:', { scope: reg.scope, active: !!reg.active })
          setRegistration(reg)

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is ready
                  setUpdateAvailable(true)
                  toast.success('New version available! Refresh to update.', {
                    duration: 10000,
                  })
                }
              })
            }
          })
        })
        .catch((error) => {
          logger.error('[SW] Registration failed:', error as Error)
        })

      // Listen for controller changes (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }, [])

  const updateServiceWorker = () => {
    if (registration?.waiting) {
      // Tell the waiting service worker to skip waiting and activate
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  return {
    registration,
    updateAvailable,
    updateServiceWorker,
  }
}
