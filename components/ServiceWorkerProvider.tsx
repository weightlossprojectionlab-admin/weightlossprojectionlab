'use client'

import { useServiceWorker } from '@/hooks/useServiceWorker'

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  // Initialize service worker
  useServiceWorker()

  return <>{children}</>
}
