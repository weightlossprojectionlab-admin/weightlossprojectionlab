'use client'

import { useEffect, useRef, useState } from 'react'
import { auth } from '@/lib/firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { logger } from '@/lib/logger'

/**
 * Hook to automatically log out users after a period of inactivity
 *
 * @param timeoutMinutes - Minutes of inactivity before auto-logout (default: 30)
 */
export function useInactivityLogout(timeoutMinutes: number = 30) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const isMountedRef = useRef<boolean>(true)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  // Monitor auth state to only track when user is logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    // Only setup inactivity tracking if user is authenticated
    if (!isAuthenticated) {
      return
    }

    const timeoutMs = timeoutMinutes * 60 * 1000

    const resetTimer = () => {
      if (!isMountedRef.current) return

      lastActivityRef.current = Date.now()

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        if (!isMountedRef.current) return

        const user = auth.currentUser
        if (user) {
          logger.info('Auto-logout due to inactivity', {
            userId: user.uid,
            inactiveMinutes: timeoutMinutes
          })

          // Use window.alert (intercepted by GlobalAlertModal for consistent styling)
          window.alert('You have been logged out due to inactivity')

          try {
            await signOut(auth)
          } catch (error) {
            logger.error('Error during auto-logout', error as Error)
          }
        }
      }, timeoutMs)
    }

    // Events that indicate user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    // Throttle activity tracking to avoid excessive timer resets
    const throttledResetTimer = () => {
      if (!isMountedRef.current) return

      if (!throttleTimeoutRef.current) {
        throttleTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current) return
          resetTimer()
          throttleTimeoutRef.current = null
        }, 1000) // Throttle to once per second
      }
    }

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, throttledResetTimer)
    })

    // Initialize timer
    resetTimer()

    // Cleanup
    return () => {
      isMountedRef.current = false

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current)
        throttleTimeoutRef.current = null
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, throttledResetTimer)
      })
    }
  }, [timeoutMinutes, isAuthenticated])
}
