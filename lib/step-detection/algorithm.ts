/**
 * Step Detection Algorithm
 *
 * Implements peak detection with signal processing to identify steps
 * from accelerometer data while filtering false positives.
 *
 * Algorithm Overview:
 * 1. Calculate acceleration magnitude vector
 * 2. Apply moving average smoothing filter
 * 3. Detect peaks (local maxima above threshold)
 * 4. Validate step timing and magnitude criteria
 * 5. Increment counter if valid step detected
 */

import {
  AccelerometerData,
  StepDetectionConfig,
  StepCounterState,
  StepValidationResult
} from './types'

/**
 * Default configuration parameters
 * Tuned for typical walking patterns
 */
export const DEFAULT_CONFIG: StepDetectionConfig = {
  sensitivity: 1.2, // g-force (1g = 9.81 m/s²)
  minStepInterval: 300, // 300ms = 200 steps/min (fast walk)
  maxStepInterval: 800, // 800ms = 75 steps/min (slow walk)
  smoothingWindow: 3, // 3-sample moving average
  minMagnitudeDelta: 0.15 // 0.15g minimum peak prominence
}

/**
 * Initial state for step counter
 */
export const INITIAL_STATE: StepCounterState = {
  totalSteps: 0,
  sessionSteps: 0,
  isActive: false,
  lastStepTimestamp: 0,
  calibrated: false,
  lastMagnitude: 0,
  magnitudeBuffer: []
}

/**
 * Calculate the magnitude of acceleration vector
 *
 * Formula: |a| = sqrt(x² + y² + z²)
 *
 * This gives total acceleration independent of device orientation.
 * Result is in m/s² (convert to g-force by dividing by 9.81)
 *
 * @param data Accelerometer reading
 * @returns Magnitude in g-force units
 */
export function calculateMagnitude(data: AccelerometerData): number {
  const magnitudeMs2 = Math.sqrt(
    data.x * data.x +
    data.y * data.y +
    data.z * data.z
  )

  // Convert m/s² to g-force (1g = 9.81 m/s²)
  return magnitudeMs2 / 9.81
}

/**
 * Apply moving average smoothing filter
 *
 * Reduces high-frequency noise from sensor while preserving
 * step signal (typical step frequency: 1-3 Hz)
 *
 * @param samples Array of magnitude values
 * @param windowSize Number of samples to average
 * @returns Smoothed value
 */
export function applySmoothingFilter(
  samples: number[],
  windowSize: number
): number {
  if (samples.length === 0) return 0

  // Use only the most recent windowSize samples
  const window = samples.slice(-windowSize)
  const sum = window.reduce((acc, val) => acc + val, 0)

  return sum / window.length
}

/**
 * Detect if current magnitude represents a peak (local maximum)
 *
 * Peak criteria:
 * 1. Smoothed magnitude exceeds sensitivity threshold
 * 2. Current value > previous value (rising edge)
 * 3. Magnitude delta meets minimum requirement
 *
 * @param magnitude Current magnitude value
 * @param timestamp Current timestamp
 * @param config Detection configuration
 * @param state Current counter state
 * @returns True if peak detected
 */
export function detectPeak(
  magnitude: number,
  timestamp: number,
  config: StepDetectionConfig,
  state: StepCounterState
): boolean {
  // Ensure we have enough data in buffer
  if (state.magnitudeBuffer.length < 2) {
    return false
  }

  // Apply smoothing filter
  const smoothedMagnitude = applySmoothingFilter(
    state.magnitudeBuffer,
    config.smoothingWindow
  )

  // Check if magnitude exceeds threshold
  if (smoothedMagnitude < config.sensitivity) {
    return false
  }

  // Check if this is a local maximum (rising then falling)
  const previousMagnitude = state.lastMagnitude
  const magnitudeDelta = smoothedMagnitude - previousMagnitude

  // Must be on rising edge or at peak
  if (magnitudeDelta < 0) {
    return false
  }

  // Check if peak is prominent enough
  if (Math.abs(magnitudeDelta) < config.minMagnitudeDelta) {
    return false
  }

  return true
}

/**
 * Validate if detected peak represents a valid step
 *
 * Filters false positives by checking:
 * 1. Time interval between steps (300-800ms typical)
 * 2. Magnitude change meets minimum threshold
 *
 * This removes:
 * - High-frequency shaking (< 300ms)
 * - Continuous vibration like driving (too regular)
 * - Small movements (magnitude too low)
 *
 * @param timeSinceLastStep Milliseconds since last step
 * @param magnitudeDelta Change in magnitude
 * @param config Detection configuration
 * @returns Validation result with reason if invalid
 */
export function isValidStep(
  timeSinceLastStep: number,
  magnitudeDelta: number,
  config: StepDetectionConfig
): StepValidationResult {
  // First step is always valid
  if (timeSinceLastStep === 0) {
    return { isValid: true }
  }

  // Check if step interval is too fast (filters phone shaking)
  if (timeSinceLastStep < config.minStepInterval) {
    return {
      isValid: false,
      reason: `Too fast: ${timeSinceLastStep}ms < ${config.minStepInterval}ms`
    }
  }

  // Check if step interval is too slow (filters sitting/standing)
  if (timeSinceLastStep > config.maxStepInterval) {
    return {
      isValid: false,
      reason: `Too slow: ${timeSinceLastStep}ms > ${config.maxStepInterval}ms`
    }
  }

  // Check if magnitude change is significant enough
  if (Math.abs(magnitudeDelta) < config.minMagnitudeDelta) {
    return {
      isValid: false,
      reason: `Magnitude too small: ${magnitudeDelta.toFixed(3)}g < ${config.minMagnitudeDelta}g`
    }
  }

  return { isValid: true }
}

/**
 * Process new accelerometer sample and detect steps
 *
 * Main entry point for step detection pipeline:
 * 1. Calculate magnitude
 * 2. Update rolling buffer
 * 3. Detect peaks
 * 4. Validate step criteria
 * 5. Update state if valid
 *
 * @param data Accelerometer reading
 * @param config Detection configuration
 * @param state Current counter state
 * @returns Updated state and whether a step was detected
 */
export function processSample(
  data: AccelerometerData,
  config: StepDetectionConfig,
  state: StepCounterState
): { newState: StepCounterState; stepDetected: boolean } {
  // Calculate magnitude
  const magnitude = calculateMagnitude(data)

  // Update rolling buffer (keep last 5 samples for smoothing)
  const newBuffer = [...state.magnitudeBuffer, magnitude].slice(-5)

  // Create updated state
  let newState = {
    ...state,
    magnitudeBuffer: newBuffer,
    lastMagnitude: magnitude
  }

  // Don't process if not active
  if (!state.isActive) {
    return { newState, stepDetected: false }
  }

  // Detect peak
  const isPeak = detectPeak(magnitude, data.timestamp, config, newState)

  if (!isPeak) {
    return { newState, stepDetected: false }
  }

  // Calculate time since last step
  const timeSinceLastStep = state.lastStepTimestamp === 0
    ? 0
    : data.timestamp - state.lastStepTimestamp

  // Get smoothed magnitude for delta calculation
  const smoothedMagnitude = applySmoothingFilter(newBuffer, config.smoothingWindow)
  const magnitudeDelta = smoothedMagnitude - state.lastMagnitude

  // Validate step
  const validation = isValidStep(timeSinceLastStep, magnitudeDelta, config)

  if (!validation.isValid) {
    // console.log('[Step Detection] Invalid step:', validation.reason)
    return { newState, stepDetected: false }
  }

  // Valid step detected - increment counters
  newState = {
    ...newState,
    totalSteps: state.totalSteps + 1,
    sessionSteps: state.sessionSteps + 1,
    lastStepTimestamp: data.timestamp
  }

  return { newState, stepDetected: true }
}

/**
 * Reset session steps (keeps total count)
 */
export function resetSession(state: StepCounterState): StepCounterState {
  return {
    ...state,
    sessionSteps: 0,
    lastStepTimestamp: 0
  }
}

/**
 * Reset all counters and state
 */
export function resetAll(): StepCounterState {
  return { ...INITIAL_STATE }
}

/**
 * Merge user configuration with defaults
 */
export function mergeConfig(
  userConfig?: Partial<StepDetectionConfig>
): StepDetectionConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig
  }
}
