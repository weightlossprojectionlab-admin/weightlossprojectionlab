'use client'

import { useEffect, useRef } from 'react'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

/**
 * Hook to automatically log out users after a period of inactivity
 *
 * @param timeoutMinutes - Minutes of inactivity before auto-logout (default: 30)
 */
export function useInactivityLogout(timeoutMinutes: number = 30) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  useEffect(() => {
    const timeoutMs = timeoutMinutes * 60 * 1000

    const resetTimer = () => {
      lastActivityRef.current = Date.now()

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        const user = auth.currentUser
        if (user) {
          logger.info('Auto-logout due to inactivity', {
            userId: user.uid,
            inactiveMinutes: timeoutMinutes
          })

          toast.error('You have been logged out due to inactivity', {
            duration: 5000
          })

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
    let throttleTimeout: NodeJS.Timeout | null = null
    const throttledResetTimer = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          resetTimer()
          throttleTimeout = null
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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (throttleTimeout) {
        clearTimeout(throttleTimeout)
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, throttledResetTimer)
      })
    }
  }, [timeoutMinutes])
}
