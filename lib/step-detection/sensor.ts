/**
 * Device Sensor Management
 *
 * Handles access to device motion sensors with platform-specific
 * permission handling and fallbacks.
 *
 * Platform Support:
 * - iOS 13+: Requires DeviceMotionEvent.requestPermission()
 * - Android: No permission required
 * - Desktop: Limited/no support (graceful degradation)
 */

import { AccelerometerData, SensorStatus } from './types'

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
 * Global reference to event listener for cleanup
 */
let motionListener: ((event: DeviceMotionEvent) => void) | null = null
let lastSampleTime = 0

/**
 * Check if DeviceMotionEvent API is available
 *
 * @returns True if device supports motion sensors
 */
export function isSensorAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'DeviceMotionEvent' in window
  )
}

/**
 * Check if device requires permission (iOS 13+)
 *
 * @returns True if permission request is needed
 */
export function needsPermission(): boolean {
  if (!isSensorAvailable()) return false

  // iOS 13+ requires permission
  return (
    typeof (DeviceMotionEvent as any).requestPermission === 'function'
  )
}

/**
 * Request permission to access motion sensors (iOS 13+)
 *
 * Must be called from user gesture (button click, etc.)
 *
 * @returns Promise resolving to true if granted
 */
export async function requestMotionPermission(): Promise<boolean> {
  if (!needsPermission()) {
    // Android or older iOS - no permission needed
    return true
  }

  try {
    const permission = await (DeviceMotionEvent as any).requestPermission()
    return permission === 'granted'
  } catch (error) {
    console.error('[Sensor] Permission request failed:', error)
    return false
  }
}

/**
 * Get current sensor status
 *
 * @returns Sensor availability and permission info
 */
export async function getSensorStatus(): Promise<SensorStatus> {
  const isAvailable = isSensorAvailable()
  const needsPerm = needsPermission()

  let hasPermission = false

  if (isAvailable && needsPerm) {
    // Try to check existing permission (iOS 13+)
    try {
      // There's no way to check permission without requesting,
      // so we'll assume false until explicitly granted
      hasPermission = false
    } catch {
      hasPermission = false
    }
  } else if (isAvailable) {
    // Android or older iOS - assume granted
    hasPermission = true
  }

  return {
    isAvailable,
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
 * Uses accelerationIncludingGravity (more widely supported) as fallback.
 *
 * @param callback Function to call with each sample
 * @returns True if started successfully
 */
export function startSensor(
  callback: (data: AccelerometerData) => void
): boolean {
  if (!isSensorAvailable()) {
    console.error('[Sensor] DeviceMotionEvent not available')
    return false
  }

  // Stop any existing listener
  stopSensor()

  // Reset throttle timer
  lastSampleTime = 0

  // Create motion event listener with throttling
  motionListener = (event: DeviceMotionEvent) => {
    const now = Date.now()

    // Throttle to target sample rate
    if (now - lastSampleTime < MIN_SAMPLE_INTERVAL) {
      return
    }

    lastSampleTime = now

    // Extract acceleration data
    // Prefer accelerationIncludingGravity (more widely supported)
    const accel = event.accelerationIncludingGravity || event.acceleration

    if (!accel || accel.x === null || accel.y === null || accel.z === null) {
      console.warn('[Sensor] No acceleration data available')
      return
    }

    // Create accelerometer data object
    const data: AccelerometerData = {
      x: accel.x,
      y: accel.y,
      z: accel.z,
      timestamp: now
    }

    callback(data)
  }

  // Add event listener
  try {
    window.addEventListener('devicemotion', motionListener)
    console.log('[Sensor] Started listening to device motion')
    return true
  } catch (error) {
    console.error('[Sensor] Failed to start listening:', error)
    return false
  }
}

/**
 * Stop listening to device motion events
 */
export function stopSensor(): void {
  if (motionListener) {
    window.removeEventListener('devicemotion', motionListener)
    motionListener = null
    console.log('[Sensor] Stopped listening to device motion')
  }
}

/**
 * Complete sensor initialization flow
 *
 * Handles permission request and sensor startup in one call.
 * Must be called from user gesture if permission is needed.
 *
 * @param callback Function to call with each sample
 * @returns Object with success status and error message if failed
 */
export async function initializeSensor(
  callback: (data: AccelerometerData) => void
): Promise<{ success: boolean; error?: string }> {
  // Check availability
  if (!isSensorAvailable()) {
    return {
      success: false,
      error: 'Motion sensors not available on this device'
    }
  }

  // Request permission if needed
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
  const started = startSensor(callback)

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

  return new Promise((resolve, reject) => {
    const callback = (data: AccelerometerData) => {
      samples.push(data)
    }

    initializeSensor(callback).then(result => {
      if (!result.success) {
        reject(new Error(result.error))
        return
      }

      setTimeout(() => {
        stopSensor()
        resolve(samples)
      }, duration)
    })
  })
}
