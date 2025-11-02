/**
 * Auto-Calibration System
 *
 * Allows users to calibrate sensitivity to their walking pattern
 * and device characteristics.
 *
 * Calibration Process:
 * 1. User walks normally for 20 steps
 * 2. System records magnitude values
 * 3. Calculates optimal sensitivity threshold
 * 4. Saves to localStorage for persistence
 */

import { logger } from '@/lib/logger'
import {
  CalibrationData,
  StepDetectionConfig,
  AccelerometerData
} from './types'
import { calculateMagnitude, DEFAULT_CONFIG } from './algorithm'

/**
 * Number of steps to collect during calibration
 */
const CALIBRATION_STEPS_REQUIRED = 20

/**
 * localStorage key for calibration data
 */
const CALIBRATION_STORAGE_KEY = 'step-calibration'

/**
 * Initial calibration state
 */
const INITIAL_CALIBRATION: CalibrationData = {
  samples: [],
  stepCount: 0,
  minMagnitude: Infinity,
  maxMagnitude: -Infinity,
  avgMagnitude: 0,
  isComplete: false
}

/**
 * Current calibration session data
 */
let currentCalibration: CalibrationData = { ...INITIAL_CALIBRATION }

/**
 * Start a new calibration session
 *
 * Resets all calibration data and begins collecting samples.
 */
export function startCalibration(): void {
  currentCalibration = { ...INITIAL_CALIBRATION }
  logger.info('[Calibration] Started - walk normally for 20 steps')
}

/**
 * Process accelerometer sample during calibration
 *
 * Collects magnitude samples to analyze walking pattern.
 *
 * @param data Accelerometer reading
 */
export function processCalibrationSample(data: AccelerometerData): void {
  if (currentCalibration.isComplete) {
    return
  }

  const magnitude = calculateMagnitude(data)

  // Add to samples
  currentCalibration.samples.push(magnitude)

  // Update min/max
  if (magnitude < currentCalibration.minMagnitude) {
    currentCalibration.minMagnitude = magnitude
  }
  if (magnitude > currentCalibration.maxMagnitude) {
    currentCalibration.maxMagnitude = magnitude
  }
}

/**
 * Record a step during calibration
 *
 * Called by step detection algorithm when a step is detected.
 *
 * @returns True if calibration is complete
 */
export function recordCalibrationStep(): boolean {
  currentCalibration.stepCount++

  logger.debug('[Calibration] Step recorded', {
    stepCount: currentCalibration.stepCount,
    stepsRequired: CALIBRATION_STEPS_REQUIRED
  })

  if (currentCalibration.stepCount >= CALIBRATION_STEPS_REQUIRED) {
    currentCalibration.isComplete = true
    logger.info('[Calibration] Complete!')
    return true
  }

  return false
}

/**
 * Finish calibration and calculate optimal configuration
 *
 * Analyzes collected samples to determine:
 * - Average magnitude during walking
 * - Optimal sensitivity threshold (80% of average)
 * - Magnitude variance for filtering
 *
 * @returns Optimized configuration
 */
export function finishCalibration(): StepDetectionConfig {
  if (!currentCalibration.isComplete) {
    logger.warn('[Calibration] Not complete yet')
    return DEFAULT_CONFIG
  }

  const { samples, minMagnitude, maxMagnitude } = currentCalibration

  if (samples.length === 0) {
    logger.error('[Calibration] No samples collected')
    return DEFAULT_CONFIG
  }

  // Calculate average magnitude
  const sum = samples.reduce((acc, val) => acc + val, 0)
  const avgMagnitude = sum / samples.length

  currentCalibration.avgMagnitude = avgMagnitude

  // Calculate standard deviation for variance analysis
  const variance = samples.reduce((acc, val) => {
    return acc + Math.pow(val - avgMagnitude, 2)
  }, 0) / samples.length
  const stdDev = Math.sqrt(variance)

  // Set sensitivity to 80% of average magnitude
  // This ensures we catch most steps while filtering noise
  const sensitivity = avgMagnitude * 0.8

  // Calculate min magnitude delta based on variance
  // Use 50% of standard deviation as minimum peak prominence
  const minMagnitudeDelta = Math.max(0.15, stdDev * 0.5)

  const calibratedConfig: StepDetectionConfig = {
    ...DEFAULT_CONFIG,
    sensitivity,
    minMagnitudeDelta
  }

  logger.info('[Calibration] Results', {
    avgMagnitude: avgMagnitude.toFixed(3),
    minMagnitude: minMagnitude.toFixed(3),
    maxMagnitude: maxMagnitude.toFixed(3),
    stdDev: stdDev.toFixed(3),
    sensitivity: sensitivity.toFixed(3),
    minMagnitudeDelta: minMagnitudeDelta.toFixed(3)
  })

  return calibratedConfig
}

/**
 * Get current calibration progress
 *
 * @returns Calibration data with progress info
 */
export function getCalibrationProgress(): CalibrationData {
  return { ...currentCalibration }
}

/**
 * Check if calibration is in progress
 */
export function isCalibrating(): boolean {
  return currentCalibration.stepCount > 0 && !currentCalibration.isComplete
}

/**
 * Save calibration to localStorage
 *
 * Persists calibrated config for future sessions.
 *
 * @param userId User identifier (optional)
 * @param config Configuration to save
 */
export function saveCalibration(
  userId: string | null,
  config: StepDetectionConfig
): void {
  try {
    const key = userId
      ? `${CALIBRATION_STORAGE_KEY}-${userId}`
      : CALIBRATION_STORAGE_KEY

    const data = {
      config,
      calibrationData: currentCalibration,
      timestamp: Date.now()
    }

    localStorage.setItem(key, JSON.stringify(data))
    logger.debug('[Calibration] Saved to localStorage')
  } catch (error) {
    logger.error('[Calibration] Failed to save', error as Error)
  }
}

/**
 * Load calibration from localStorage
 *
 * @param userId User identifier (optional)
 * @returns Saved configuration or null if not found
 */
export function loadCalibration(
  userId: string | null
): StepDetectionConfig | null {
  try {
    const key = userId
      ? `${CALIBRATION_STORAGE_KEY}-${userId}`
      : CALIBRATION_STORAGE_KEY

    const stored = localStorage.getItem(key)

    if (!stored) {
      return null
    }

    const data = JSON.parse(stored)

    // Check if calibration is recent (within 30 days)
    const age = Date.now() - data.timestamp
    const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days

    if (age > maxAge) {
      logger.debug('[Calibration] Stored calibration expired')
      return null
    }

    logger.debug('[Calibration] Loaded from localStorage')
    return data.config
  } catch (error) {
    logger.error('[Calibration] Failed to load', error as Error)
    return null
  }
}

/**
 * Clear saved calibration
 *
 * @param userId User identifier (optional)
 */
export function clearCalibration(userId: string | null): void {
  try {
    const key = userId
      ? `${CALIBRATION_STORAGE_KEY}-${userId}`
      : CALIBRATION_STORAGE_KEY

    localStorage.removeItem(key)
    logger.debug('[Calibration] Cleared from localStorage')
  } catch (error) {
    logger.error('[Calibration] Failed to clear', error as Error)
  }
}

/**
 * Reset current calibration session
 */
export function resetCalibration(): void {
  currentCalibration = { ...INITIAL_CALIBRATION }
  logger.debug('[Calibration] Reset')
}
