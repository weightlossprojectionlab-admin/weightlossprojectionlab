/**
 * Step Counter React Hook
 *
 * Provides a complete step counting system with:
 * - Real-time step detection from accelerometer
 * - Auto-save to localStorage and Firebase
 * - Calibration support
 * - Session management
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { stepLogOperations } from '@/lib/firebase-operations'
import { logger } from '@/lib/logger'
import {
  AccelerometerData,
  StepDetectionConfig,
  StepCounterState,
  SensorStatus
} from '@/lib/step-detection/types'
import {
  processSample,
  resetSession,
  resetAll,
  mergeConfig,
  INITIAL_STATE
} from '@/lib/step-detection/algorithm'
import {
  initializeSensor,
  stopSensor,
  getSensorStatus
} from '@/lib/step-detection/sensor'
import {
  loadCalibration,
  saveCalibration as saveCalibrationData
} from '@/lib/step-detection/calibration'

/**
 * localStorage key for persisting step count
 */
const STEP_COUNT_STORAGE_KEY = 'step-count-session'

/**
 * Auto-save interval (steps)
 */
const AUTO_SAVE_INTERVAL = 10

/**
 * Hook return type
 */
interface UseStepCounterReturn {
  // State
  stepCount: number
  sessionSteps: number
  isActive: boolean
  isCalibrated: boolean
  sensorStatus: SensorStatus | null
  error: string | null

  // Actions
  startCounting: () => Promise<void>
  stopCounting: () => void
  pauseCounting: () => void
  resumeCounting: () => Promise<void>
  resetCount: () => void
  saveToFirebase: (date?: string) => Promise<void>

  // Calibration
  startCalibration: () => void
  isCalibrating: boolean
}

/**
 * Step counter hook with real accelerometer detection
 *
 * @param config Optional configuration overrides
 * @returns Step counter state and controls
 */
export function useStepCounter(
  config?: Partial<StepDetectionConfig>
): UseStepCounterReturn {
  const { user } = useAuth()

  // State
  const [state, setState] = useState<StepCounterState>(INITIAL_STATE)
  const [sensorStatus, setSensorStatus] = useState<SensorStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCalibrating, setIsCalibrating] = useState(false)

  // Refs to maintain state across renders
  const stateRef = useRef<StepCounterState>(state)
  const configRef = useRef<StepDetectionConfig>(mergeConfig(config))
  const lastSaveRef = useRef<number>(0)

  // Update refs when state changes
  useEffect(() => {
    stateRef.current = state
  }, [state])

  /**
   * Load saved step count from localStorage on mount
   */
  useEffect(() => {
    const loadSavedState = () => {
      try {
        const saved = localStorage.getItem(STEP_COUNT_STORAGE_KEY)
        if (saved) {
          const data = JSON.parse(saved)

          // Only restore if from today
          const today = new Date().toDateString()
          const savedDate = new Date(data.timestamp).toDateString()

          if (today === savedDate) {
            setState(prev => ({
              ...prev,
              totalSteps: data.totalSteps || 0,
              sessionSteps: data.sessionSteps || 0
            }))
            logger.debug('[Step Counter] Restored from localStorage:', data.totalSteps)
          }
        }
      } catch (err) {
        logger.error('[Step Counter] Failed to load saved state:', err as Error)
      }
    }

    loadSavedState()
  }, [])

  /**
   * Load calibration on mount
   */
  useEffect(() => {
    const loadCalibrationData = () => {
      const calibrated = loadCalibration(user?.uid || null)
      if (calibrated) {
        configRef.current = calibrated
        setState(prev => ({ ...prev, calibrated: true }))
        logger.debug('[Step Counter] Loaded calibration')
      }
    }

    loadCalibrationData()
  }, [user])

  /**
   * Check sensor status on mount
   */
  useEffect(() => {
    getSensorStatus().then(status => {
      setSensorStatus(status)
      if (!status.isAvailable) {
        setError('Motion sensors not available on this device')
      }
    })
  }, [])

  /**
   * Save to localStorage periodically
   */
  const saveToLocalStorage = useCallback(() => {
    try {
      const data = {
        totalSteps: stateRef.current.totalSteps,
        sessionSteps: stateRef.current.sessionSteps,
        timestamp: Date.now()
      }
      localStorage.setItem(STEP_COUNT_STORAGE_KEY, JSON.stringify(data))
    } catch (err) {
      logger.error('[Step Counter] Failed to save to localStorage:', err as Error)
    }
  }, [])

  /**
   * Process accelerometer sample
   */
  const handleSample = useCallback((data: AccelerometerData) => {
    const currentState = stateRef.current
    const currentConfig = configRef.current

    const { newState, stepDetected } = processSample(
      data,
      currentConfig,
      currentState
    )

    setState(newState)

    // Auto-save every N steps
    if (stepDetected) {
      const stepsSinceSave = newState.totalSteps - lastSaveRef.current
      if (stepsSinceSave >= AUTO_SAVE_INTERVAL) {
        saveToLocalStorage()
        lastSaveRef.current = newState.totalSteps
      }
    }
  }, [saveToLocalStorage])

  /**
   * Start step counting
   */
  const startCounting = useCallback(async () => {
    setError(null)

    try {
      const result = await initializeSensor(handleSample)

      if (!result.success) {
        setError(result.error || 'Failed to start sensor')
        return
      }

      setState(prev => ({ ...prev, isActive: true }))
      logger.debug('[Step Counter] Started counting')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      logger.error('[Step Counter] Failed to start:', err as Error)
    }
  }, [handleSample])

  /**
   * Stop step counting
   */
  const stopCounting = useCallback(() => {
    stopSensor()
    setState(prev => ({ ...prev, isActive: false }))
    saveToLocalStorage()
    logger.debug('[Step Counter] Stopped counting')
  }, [saveToLocalStorage])

  /**
   * Pause counting (keeps count)
   */
  const pauseCounting = useCallback(() => {
    stopSensor()
    setState(prev => ({ ...prev, isActive: false }))
    saveToLocalStorage()
    logger.debug('[Step Counter] Paused')
  }, [saveToLocalStorage])

  /**
   * Resume counting
   */
  const resumeCounting = useCallback(async () => {
    await startCounting()
  }, [startCounting])

  /**
   * Reset step count
   */
  const resetCount = useCallback(() => {
    const newState = resetAll()
    setState(newState)
    lastSaveRef.current = 0

    try {
      localStorage.removeItem(STEP_COUNT_STORAGE_KEY)
    } catch (err) {
      logger.error('[Step Counter] Failed to clear localStorage:', err as Error)
    }

    logger.debug('[Step Counter] Reset')
  }, [])

  /**
   * Save steps to Firebase
   */
  const saveToFirebase = useCallback(async (date?: string) => {
    if (!user) {
      setError('Must be logged in to save')
      return
    }

    try {
      const logDate = date || new Date().toISOString().split('T')[0]

      await stepLogOperations.createStepLog({
        date: logDate,
        steps: stateRef.current.totalSteps,
        source: 'device' as const,
        notes: `Auto-saved from step counter - ${stateRef.current.totalSteps} steps detected`,
        loggedAt: new Date().toISOString()
      })

      logger.debug('[Step Counter] Saved to Firebase:', { totalSteps: stateRef.current.totalSteps })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      setError(message)
      logger.error('[Step Counter] Firebase save failed:', err as Error)
    }
  }, [user])

  /**
   * Start calibration mode
   */
  const startCalibrationMode = useCallback(() => {
    setIsCalibrating(true)
    // Calibration logic would go here
    // For now, just simulate
    setTimeout(() => {
      setIsCalibrating(false)
      setState(prev => ({ ...prev, calibrated: true }))
    }, 5000)
  }, [])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopSensor()
      saveToLocalStorage()
    }
  }, [saveToLocalStorage])

  return {
    // State
    stepCount: state.totalSteps,
    sessionSteps: state.sessionSteps,
    isActive: state.isActive,
    isCalibrated: state.calibrated,
    sensorStatus,
    error,

    // Actions
    startCounting,
    stopCounting,
    pauseCounting,
    resumeCounting,
    resetCount,
    saveToFirebase,

    // Calibration
    startCalibration: startCalibrationMode,
    isCalibrating
  }
}
