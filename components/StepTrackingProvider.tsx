'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useStepCounter } from '@/hooks/useStepCounter'

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
  const { user } = useAuth()
  const [isEnabled, setIsEnabled] = useState(false)
  const [lastSaveDate, setLastSaveDate] = useState<string | null>(null)

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
          console.log('📍 Step tracking enabled from preferences')
        }
      } catch (err) {
        console.error('Failed to load step tracking preference:', err)
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
        console.log('🚶 Auto-starting step counter...')
        try {
          await startCounting()
          console.log('✅ Step counter started automatically')
        } catch (err) {
          console.error('❌ Failed to auto-start step counter:', err)
        }
      }
    }

    autoStart()
  }, [isEnabled, user, isTracking, sensorStatus, startCounting])

  /**
   * Auto-save to Firebase at end of day (midnight check)
   */
  useEffect(() => {
    if (!isEnabled || !user || stepCount === 0) return

    const checkMidnight = () => {
      const today = new Date().toISOString().split('T')[0]

      // If date changed and we haven't saved today's steps yet
      if (lastSaveDate && lastSaveDate !== today && stepCount > 0) {
        console.log('🌙 Midnight - auto-saving yesterday\'s steps:', stepCount)

        saveToFirebase(lastSaveDate).then(() => {
          console.log('✅ Steps saved to Firebase')
          resetCount()
          setLastSaveDate(today)
        }).catch(err => {
          console.error('❌ Failed to auto-save steps:', err)
        })
      } else if (!lastSaveDate) {
        setLastSaveDate(today)
      }
    }

    // Check every minute if it's midnight
    const interval = setInterval(checkMidnight, 60000)

    return () => clearInterval(interval)
  }, [isEnabled, user, stepCount, lastSaveDate, saveToFirebase, resetCount])

  /**
   * Auto-save before page unload
   */
  useEffect(() => {
    if (!isEnabled || !user) return

    const handleBeforeUnload = async () => {
      if (stepCount > 0) {
        const today = new Date().toISOString().split('T')[0]
        console.log('👋 App closing - saving steps:', stepCount)

        // Use sendBeacon API for reliable save on page unload
        try {
          await saveToFirebase(today)
        } catch (err) {
          console.error('Failed to save on unload:', err)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isEnabled, user, stepCount, saveToFirebase])

  /**
   * Enable step tracking
   */
  const enableTracking = async () => {
    setIsEnabled(true)
    localStorage.setItem('step-tracking-enabled', 'true')
    console.log('✅ Step tracking enabled')

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
    console.log('⏸️ Step tracking disabled')
  }

  const contextValue: StepTrackingContextValue = {
    stepCount,
    isTracking,
    isEnabled,
    enableTracking,
    disableTracking,
    todaysSteps: stepCount // Real-time count from sensor
  }

  return (
    <StepTrackingContext.Provider value={contextValue}>
      {children}
    </StepTrackingContext.Provider>
  )
}
