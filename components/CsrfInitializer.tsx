'use client'

import { useEffect, useRef } from 'react'
import { initCSRFProtection, getCSRFToken } from '@/lib/csrf'

/**
 * Initialize CSRF protection on app load
 * This ensures the CSRF token is available before any API calls are made
 */
export function CsrfInitializer() {
  const initializedRef = useRef(false)

  // Initialize immediately on mount (synchronous)
  if (!initializedRef.current) {
    initCSRFProtection()
    initializedRef.current = true
  }

  // Also initialize in useEffect as a fallback
  useEffect(() => {
    if (!initializedRef.current) {
      initCSRFProtection()
      initializedRef.current = true
    }
  }, [])

  return null
}
