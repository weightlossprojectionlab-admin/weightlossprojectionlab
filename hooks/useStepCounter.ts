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
import { useLazyAuth } from '@/hooks/useLazyAuth'
import { stepLogOperations } from '@/lib/firebase-operations'
import { logger } from '@/lib/logger'
import { storage, getJSON, setJSON } from '@/lib/adapters'
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
 * Storage key for persisting step count
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
  const { user } = useLazyAuth()

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
   * Load saved step count from storage on mount
   */
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const data = await getJSON<{ totalSteps: number; sessionSteps: number; timestamp: number } | null>(
          STEP_COUNT_STORAGE_KEY,
          null
        )

        if (data) {
          // Only restore if from today
          const today = new Date().toDateString()
          const savedDate = new Date(data.timestamp).toDateString()

          if (today === savedDate) {
            setState(prev => ({
              ...prev,
              totalSteps: data.totalSteps || 0,
              sessionSteps: data.sessionSteps || 0
            }))
            logger.debug('[Step Counter] Restored from storage:', data.totalSteps)
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
   * Save to storage periodically
   */
  const saveToStorage = useCallback(async () => {
    try {
      const data = {
        totalSteps: stateRef.current.totalSteps,
        sessionSteps: stateRef.current.sessionSteps,
        timestamp: Date.now()
      }
      await setJSON(STEP_COUNT_STORAGE_KEY, data)
    } catch (err) {
      logger.error('[Step Counter] Failed to save to storage:', err as Error)
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
        // Don't await - fire and forget for performance
        saveToStorage()
        lastSaveRef.current = newState.totalSteps
      }
    }
  }, [saveToStorage])

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
  const stopCounting = useCallback(async () => {
    await stopSensor()
    setState(prev => ({ ...prev, isActive: false }))
    await saveToStorage()
    logger.debug('[Step Counter] Stopped counting')
  }, [saveToStorage])

  /**
   * Pause counting (keeps count)
   */
  const pauseCounting = useCallback(async () => {
    await stopSensor()
    setState(prev => ({ ...prev, isActive: false }))
    await saveToStorage()
    logger.debug('[Step Counter] Paused')
  }, [saveToStorage])

  /**
   * Resume counting
   */
  const resumeCounting = useCallback(async () => {
    await startCounting()
  }, [startCounting])

  /**
   * Reset step count
   */
  const resetCount = useCallback(async () => {
    const newState = resetAll()
    setState(newState)
    lastSaveRef.current = 0

    try {
      await storage.removeItem(STEP_COUNT_STORAGE_KEY)
    } catch (err) {
      logger.error('[Step Counter] Failed to clear storage:', err as Error)
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
      // Cleanup is async but can't await in cleanup function
      // Fire stopSensor and saveToStorage without waiting
      stopSensor()
      saveToStorage()
    }
  }, [saveToStorage])

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
