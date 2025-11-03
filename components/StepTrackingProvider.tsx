'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useLazyAuth } from '@/hooks/useLazyAuth'
import { useStepCounter } from '@/hooks/useStepCounter'
import { logger } from '@/lib/logger'

/**
 * Step Tracking Context
 *
 * Provides automatic background step tracking throughout the app.
 * Steps are counted using device motion sensors and auto-saved to Firebase.
 */

interface StepTrackingContextValue {
  stepCount: number
  isTracking: boolean
  isEnabled: boolean
  enableTracking: () => Promise<void>
  disableTracking: () => void
  todaysSteps: number // From sensor, not logs
  lastSaveStepCount: number // Last saved count
  manualSave: () => Promise<void> // Manual save trigger
}

const StepTrackingContext = createContext<StepTrackingContextValue | null>(null)

export function useStepTracking() {
  const context = useContext(StepTrackingContext)
  if (!context) {
    throw new Error('useStepTracking must be used within StepTrackingProvider')
  }
  return context
}

interface StepTrackingProviderProps {
  children: ReactNode
}

export function StepTrackingProvider({ children }: StepTrackingProviderProps) {
  const { user } = useLazyAuth()
  const [isEnabled, setIsEnabled] = useState(false)
  const [lastSaveDate, setLastSaveDate] = useState<string | null>(null)
  const [lastSaveStepCount, setLastSaveStepCount] = useState(0)

  // Use step counter hook for automatic detection
  const {
    stepCount,
    isActive: isTracking,
    sensorStatus,
    error,
    startCounting,
    stopCounting,
    saveToFirebase,
    resetCount
  } = useStepCounter()

  /**
   * Load step tracking preference from localStorage on mount
   * (Will be replaced with Firebase preferences later)
   */
  useEffect(() => {
    const loadPreference = () => {
      try {
        const enabled = localStorage.getItem('step-tracking-enabled')
        if (enabled === 'true') {
          setIsEnabled(true)
          logger.debug('📍 Step tracking enabled from preferences')
        }
      } catch (err) {
        logger.error('Failed to load step tracking preference:', err as Error)
      }
    }

    loadPreference()
  }, [])

  /**
   * Auto-start step counting when enabled and user is logged in
   */
  useEffect(() => {
    const autoStart = async () => {
      if (isEnabled && user && !isTracking && sensorStatus?.isAvailable) {
        logger.debug('🚶 Auto-starting step counter...')
        try {
          await startCounting()
          logger.debug('✅ Step counter started automatically')
        } catch (err) {
          logger.error('❌ Failed to auto-start step counter:', err as Error)
        }
      }
    }

    autoStart()
  }, [isEnabled, user, isTracking, sensorStatus, startCounting])

  /**
   * Periodic auto-save: Save every 100 steps OR every 5 minutes
   */
  useEffect(() => {
    if (!isEnabled || !user || !isTracking) return

    const STEPS_THRESHOLD = 100
    const TIME_INTERVAL = 5 * 60 * 1000 // 5 minutes

    // Save based on step count threshold
    if (stepCount > 0 && stepCount - lastSaveStepCount >= STEPS_THRESHOLD) {
      const today = new Date().toISOString().split('T')[0]
      logger.debug('💾 Auto-saving (100 steps reached):', { stepCount })

      saveToFirebase(today).then(() => {
        setLastSaveStepCount(stepCount)
        setLastSaveDate(today)
        logger.debug('✅ Steps saved to Firebase (periodic)', { stepCount })
      }).catch(err => {
        logger.error('❌ Failed to auto-save steps (periodic):', err)
      })
    }

    // Also save periodically by time
    const timeInterval = setInterval(() => {
      if (stepCount > lastSaveStepCount) {
        const today = new Date().toISOString().split('T')[0]
        logger.debug('💾 Auto-saving (5 min timer):', { stepCount })

        saveToFirebase(today).then(() => {
          setLastSaveStepCount(stepCount)
          setLastSaveDate(today)
          logger.debug('✅ Steps saved to Firebase (timer)', { stepCount })
        }).catch(err => {
          logger.error('❌ Failed to auto-save steps (timer):', err)
        })
      }
    }, TIME_INTERVAL)

    return () => clearInterval(timeInterval)
  }, [isEnabled, user, isTracking, stepCount, lastSaveStepCount, saveToFirebase])

  /**
   * Auto-save before page unload using sendBeacon for reliability
   */
  useEffect(() => {
    if (!isEnabled || !user) return

    const handleBeforeUnload = () => {
      if (stepCount > lastSaveStepCount) {
        const today = new Date().toISOString().split('T')[0]
        logger.debug('👋 App closing - saving steps:', { stepCount })

        // Use navigator.sendBeacon for reliable unload saves (synchronous)
        // This API is specifically designed for analytics/tracking on page unload
        try {
          const data = JSON.stringify({
            steps: stepCount,
            date: today,
            source: 'device',
            notes: `Auto-saved on unload - ${stepCount} steps`,
            loggedAt: new Date().toISOString()
          })

          // Try sendBeacon first (most reliable)
          if ('sendBeacon' in navigator && typeof navigator.sendBeacon === 'function') {
            // We'll need to get the auth token synchronously
            // For now, fallback to localStorage save and rely on periodic saves
            logger.debug('📡 Using periodic saves (sendBeacon needs auth token)')
          }

          // Ensure localStorage is updated
          localStorage.setItem('step-count-last-save', stepCount.toString())
        } catch (err) {
          logger.error('Failed to save on unload:', err as Error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isEnabled, user, stepCount, lastSaveStepCount])

  /**
   * Enable step tracking
   */
  const enableTracking = async () => {
    setIsEnabled(true)
    localStorage.setItem('step-tracking-enabled', 'true')
    logger.debug('✅ Step tracking enabled')

    // Start counting immediately
    if (user && sensorStatus?.isAvailable) {
      await startCounting()
    }
  }

  /**
   * Disable step tracking
   */
  const disableTracking = () => {
    setIsEnabled(false)
    localStorage.setItem('step-tracking-enabled', 'false')
    stopCounting()
    logger.debug('⏸️ Step tracking disabled')
  }

  /**
   * Manual save trigger
   */
  const manualSave = async () => {
    if (!user) {
      throw new Error('Must be logged in to save')
    }

    if (stepCount === 0) {
      throw new Error('No steps to save')
    }

    const today = new Date().toISOString().split('T')[0]
    logger.debug('💾 Manual save triggered:', { stepCount })

    await saveToFirebase(today)
    setLastSaveStepCount(stepCount)
    setLastSaveDate(today)
    logger.debug('✅ Manual save completed', { stepCount })
  }

  const contextValue: StepTrackingContextValue = {
    stepCount,
    isTracking,
    isEnabled,
    enableTracking,
    disableTracking,
    todaysSteps: stepCount, // Real-time count from sensor
    lastSaveStepCount,
    manualSave
  }

  return (
    <StepTrackingContext.Provider value={contextValue}>
      {children}
    </StepTrackingContext.Provider>
  )
}
