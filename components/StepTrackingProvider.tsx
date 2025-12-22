'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useLazyAuth } from '@/hooks/useLazyAuth'
import { useStepCounter } from '@/hooks/useStepCounter'
import { logger } from '@/lib/logger'
import { userProfileOperations } from '@/lib/firebase-operations'
import { storage, getJSON, setJSON } from '@/lib/adapters'

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
  disableTracking: () => Promise<void>
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
   * Load step tracking preference from Firestore, fallback to storage
   */
  useEffect(() => {
    const loadPreference = async () => {
      try {
        // Try Firebase first if user is authenticated
        if (user) {
          try {
            const profile = await userProfileOperations.getUserProfile()
            const firestoreEnabled = profile.data?.preferences?.stepTrackingEnabled

            if (typeof firestoreEnabled === 'boolean') {
              setIsEnabled(firestoreEnabled)
              // Sync to storage
              await storage.setItem('step-tracking-enabled', firestoreEnabled.toString())
              logger.debug('📍 Step tracking loaded from Firestore:', { enabled: firestoreEnabled })
              return
            }
          } catch (err) {
            logger.error('Failed to load from Firestore, using storage fallback:', err as Error)
          }
        }

        // Fallback to storage
        const enabled = await storage.getItem('step-tracking-enabled')
        if (enabled === 'true') {
          setIsEnabled(true)
          logger.debug('📍 Step tracking enabled from storage')
        }
      } catch (err) {
        logger.error('Failed to load step tracking preference:', err as Error)
      }
    }

    loadPreference()
  }, [user])

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

        // Save to storage before unload
        // Note: Can't use async/await in beforeunload, so we use fire-and-forget
        try {
          // Ensure storage is updated (fire and forget - can't await in beforeunload)
          storage.setItem('step-count-last-save', stepCount.toString())
          logger.debug('📡 Step count saved to storage on unload')
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
    await storage.setItem('step-tracking-enabled', 'true')

    // Save to Firestore if authenticated
    if (user) {
      try {
        await userProfileOperations.updateUserProfile({
          preferences: { stepTrackingEnabled: true }
        })
        logger.debug('✅ Step tracking enabled and saved to Firestore')
      } catch (err) {
        logger.error('Failed to save step tracking preference to Firestore:', err as Error)
      }
    } else {
      logger.debug('✅ Step tracking enabled (storage only)')
    }

    // Start counting immediately
    if (user && sensorStatus?.isAvailable) {
      await startCounting()
    }
  }

  /**
   * Disable step tracking
   */
  const disableTracking = async () => {
    setIsEnabled(false)
    await storage.setItem('step-tracking-enabled', 'false')
    stopCounting()

    // Save to Firestore if authenticated
    if (user) {
      try {
        await userProfileOperations.updateUserProfile({
          preferences: { stepTrackingEnabled: false }
        })
        logger.debug('⏸️ Step tracking disabled and saved to Firestore')
      } catch (err) {
        logger.error('Failed to save step tracking preference to Firestore:', err as Error)
      }
    } else {
      logger.debug('⏸️ Step tracking disabled (storage only)')
    }
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
