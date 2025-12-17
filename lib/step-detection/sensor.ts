/**
 * Device Sensor Management
 *
 * Handles access to device motion sensors with platform-specific
 * permission handling and fallbacks.
 *
 * Platform Support:
 * - Web: DeviceMotionEvent API (~60-70% accuracy)
 * - iOS Native: Capacitor Motion with HealthKit (~90-95% accuracy)
 * - Android Native: Capacitor Motion with Google Fit (~90-95% accuracy)
 * - Desktop: Limited/no support (graceful degradation)
 *
 * This module now uses the motion adapter to automatically select the
 * best implementation based on the current platform.
 */

import { AccelerometerData, SensorStatus } from './types'
import { logger } from '@/lib/logger'
import { motion, MotionData } from '@/lib/adapters/motion'
import { isNative } from '@/lib/adapters'

/**
 * Target sample rate for accelerometer data (Hz)
 *
 * 10-20 Hz is optimal for step detection:
 * - High enough to catch step peaks (1-3 Hz walking)
 * - Low enough to conserve battery
 * - DeviceMotionEvent typically fires at ~60 Hz, we'll throttle
 */
const TARGET_SAMPLE_RATE = 15 // Hz
const MIN_SAMPLE_INTERVAL = 1000 / TARGET_SAMPLE_RATE // ~67ms

/**
 * Global reference to callback and state
 */
let isListening = false
let lastSampleTime = 0
let currentCallback: ((data: AccelerometerData) => void) | null = null

/**
 * Check if DeviceMotionEvent API is available
 *
 * @returns True if device supports motion sensors
 */
export async function isSensorAvailable(): Promise<boolean> {
  return await motion.isAvailable()
}

/**
 * Check if device requires permission (iOS 13+ web only)
 *
 * @returns True if permission request is needed
 */
export function needsPermission(): boolean {
  // Native platforms handle permissions automatically
  if (isNative()) {
    return false
  }

  // Web: iOS 13+ requires permission
  if (typeof window === 'undefined') return false

  return (
    typeof (DeviceMotionEvent as any)?.requestPermission === 'function'
  )
}

/**
 * Request permission to access motion sensors
 *
 * Must be called from user gesture (button click, etc.) on iOS 13+ web.
 * Native platforms handle this automatically.
 *
 * @returns Promise resolving to true if granted
 */
export async function requestMotionPermission(): Promise<boolean> {
  try {
    return await motion.requestPermission()
  } catch (error) {
    logger.error('[Sensor] Permission request failed', error as Error)
    return false
  }
}

/**
 * Get current sensor status
 *
 * @returns Sensor availability and permission info
 */
export async function getSensorStatus(): Promise<SensorStatus> {
  const available = await motion.isAvailable()
  const needsPerm = needsPermission()

  // On native, permission is handled automatically
  // On web, we can't reliably check permission status without requesting
  let hasPermission = isNative() || !needsPerm

  return {
    isAvailable: available,
    hasPermission,
    needsPermission: needsPerm,
    sampleRate: TARGET_SAMPLE_RATE
  }
}

/**
 * Get optimal sample rate for device
 *
 * @returns Sample rate in Hz
 */
export function getSampleRate(): number {
  return TARGET_SAMPLE_RATE
}

/**
 * Start listening to device motion events
 *
 * Throttles samples to target rate and extracts accelerometer data.
 * Uses the motion adapter to automatically select web or native implementation.
 *
 * @param callback Function to call with each sample
 * @returns True if started successfully
 */
export async function startSensor(
  callback: (data: AccelerometerData) => void
): Promise<boolean> {
  const available = await motion.isAvailable()
  if (!available) {
    logger.error('[Sensor] Motion sensors not available', new Error('Motion sensors not available'))
    return false
  }

  // Stop any existing listener
  await stopSensor()

  // Reset throttle timer
  lastSampleTime = 0
  currentCallback = callback

  // Create motion data handler with throttling
  const handleMotionData = (motionData: MotionData) => {
    const now = Date.now()

    // Throttle to target sample rate
    if (now - lastSampleTime < MIN_SAMPLE_INTERVAL) {
      return
    }

    lastSampleTime = now

    // Extract acceleration data
    // Prefer accelerationIncludingGravity (more widely supported)
    const accel = motionData.accelerationIncludingGravity

    if (!accel || accel.x === null || accel.y === null || accel.z === null) {
      // Debug log only - this is expected on desktop/unsupported devices
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[Sensor] No acceleration data available (expected on desktop/unsupported devices)')
      }
      return
    }

    // Create accelerometer data object
    const accelerometerData: AccelerometerData = {
      x: accel.x,
      y: accel.y,
      z: accel.z,
      timestamp: now
    }

    if (currentCallback) {
      currentCallback(accelerometerData)
    }
  }

  // Start listening via adapter
  try {
    await motion.startListening(handleMotionData)
    isListening = true
    logger.info('[Sensor] Started listening to device motion via adapter')
    return true
  } catch (error) {
    logger.error('[Sensor] Failed to start listening', error as Error)
    return false
  }
}

/**
 * Stop listening to device motion events
 */
export async function stopSensor(): Promise<void> {
  if (isListening) {
    await motion.stopListening()
    isListening = false
    currentCallback = null
    logger.info('[Sensor] Stopped listening to device motion')
  }
}

/**
 * Complete sensor initialization flow
 *
 * Handles permission request and sensor startup in one call.
 * Must be called from user gesture if permission is needed (web only).
 *
 * @param callback Function to call with each sample
 * @returns Object with success status and error message if failed
 */
export async function initializeSensor(
  callback: (data: AccelerometerData) => void
): Promise<{ success: boolean; error?: string }> {
  // Check availability
  const available = await isSensorAvailable()
  if (!available) {
    return {
      success: false,
      error: 'Motion sensors not available on this device'
    }
  }

  // Request permission if needed (web only)
  if (needsPermission()) {
    const granted = await requestMotionPermission()

    if (!granted) {
      return {
        success: false,
        error: 'Motion sensor permission denied. Please enable in device settings.'
      }
    }
  }

  // Start sensor
  const started = await startSensor(callback)

  if (!started) {
    return {
      success: false,
      error: 'Failed to start motion sensor'
    }
  }

  return { success: true }
}

/**
 * Test sensor by collecting a few samples
 *
 * Useful for debugging and verifying sensor works.
 *
 * @param duration Duration to collect samples (ms)
 * @returns Promise resolving to array of samples
 */
export async function testSensor(duration = 2000): Promise<AccelerometerData[]> {
  const samples: AccelerometerData[] = []

  return new Promise(async (resolve, reject) => {
    const callback = (data: AccelerometerData) => {
      samples.push(data)
    }

    const result = await initializeSensor(callback)

    if (!result.success) {
      reject(new Error(result.error))
      return
    }

    setTimeout(async () => {
      await stopSensor()
      resolve(samples)
    }, duration)
  })
}
