/**
 * Step Detection System - Type Definitions
 *
 * Core types for accelerometer-based step counting with signal processing
 */

/**
 * Raw accelerometer data from DeviceMotionEvent
 * Units: m/s² (meters per second squared)
 */
export interface AccelerometerData {
  x: number
  y: number
  z: number
  timestamp: number
}

/**
 * Configuration parameters for step detection algorithm
 *
 * These values control sensitivity and filtering behavior:
 * - sensitivity: Minimum magnitude threshold (0.8-2.0g, default: 1.2g)
 * - minStepInterval: Fastest possible step (300ms = fast walking)
 * - maxStepInterval: Slowest possible step (800ms = slow walking)
 * - smoothingWindow: Moving average window size (3-5 samples)
 * - minMagnitudeDelta: Minimum peak prominence (0.15g)
 */
export interface StepDetectionConfig {
  sensitivity: number // g-force threshold (default: 1.2)
  minStepInterval: number // milliseconds (default: 300)
  maxStepInterval: number // milliseconds (default: 800)
  smoothingWindow: number // samples (default: 3)
  minMagnitudeDelta: number // g-force (default: 0.15)
}

/**
 * Current state of the step counter
 */
export interface StepCounterState {
  totalSteps: number // All-time step count
  sessionSteps: number // Current session count
  isActive: boolean // Currently counting
  lastStepTimestamp: number // Last detected step time (ms)
  calibrated: boolean // Has user calibrated device
  lastMagnitude: number // Previous magnitude value (for peak detection)
  magnitudeBuffer: number[] // Rolling buffer for smoothing
}

/**
 * Calibration data collected during calibration mode
 */
export interface CalibrationData {
  samples: number[] // Magnitude samples collected
  stepCount: number // Steps counted during calibration
  minMagnitude: number
  maxMagnitude: number
  avgMagnitude: number
  isComplete: boolean
}

/**
 * Result from step validation logic
 */
export interface StepValidationResult {
  isValid: boolean
  reason?: string // Debug info if invalid
}

/**
 * Sensor availability and permission status
 */
export interface SensorStatus {
  isAvailable: boolean
  hasPermission: boolean
  needsPermission: boolean // iOS 13+ only
  sampleRate: number // Hz
}

/**
 * Step log entry for Firebase persistence
 */
export interface StepLogEntry {
  userId: string
  date: string // YYYY-MM-DD
  steps: number
  timestamp: number
  source: 'manual' | 'sensor' // How steps were recorded
}
