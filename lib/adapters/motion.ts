/**
 * Motion Adapter
 *
 * Provides a unified motion/accelerometer interface across web and native platforms.
 * - Web: Uses browser DeviceMotion API (lower accuracy, ~60-70%)
 * - Native: Uses Capacitor Motion plugin with native sensors (higher accuracy, ~90-95%)
 *
 * This adapter enables step counting and motion detection across all platforms.
 */

import { Motion, AccelListenerEvent } from '@capacitor/motion'
import { isNative, isServer, isPluginAvailable } from '@/lib/platform'

export interface MotionData {
  acceleration: {
    x: number
    y: number
    z: number
  }
  accelerationIncludingGravity: {
    x: number
    y: number
    z: number
  }
  rotationRate: {
    alpha: number
    beta: number
    gamma: number
  }
  interval: number
}

export interface MotionAdapter {
  isAvailable(): Promise<boolean>
  requestPermission(): Promise<boolean>
  startListening(callback: (data: MotionData) => void): Promise<void>
  stopListening(): Promise<void>
}

/**
 * Web Motion Adapter (uses DeviceMotion API)
 */
class WebMotionAdapter implements MotionAdapter {
  private listener: ((event: DeviceMotionEvent) => void) | null = null

  async isAvailable(): Promise<boolean> {
    return typeof DeviceMotionEvent !== 'undefined'
  }

  async requestPermission(): Promise<boolean> {
    // iOS 13+ requires permission for DeviceMotion
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission()
        return permission === 'granted'
      } catch (error) {
        console.error('DeviceMotion permission denied:', error)
        return false
      }
    }

    // Other browsers don't require permission
    return true
  }

  async startListening(callback: (data: MotionData) => void): Promise<void> {
    if (this.listener) {
      console.warn('Motion listener already active')
      return
    }

    this.listener = (event: DeviceMotionEvent) => {
      const acceleration = event.acceleration || { x: 0, y: 0, z: 0 }
      const accelerationIncludingGravity = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 }
      const rotationRate = event.rotationRate || { alpha: 0, beta: 0, gamma: 0 }

      callback({
        acceleration: {
          x: acceleration.x ?? 0,
          y: acceleration.y ?? 0,
          z: acceleration.z ?? 0,
        },
        accelerationIncludingGravity: {
          x: accelerationIncludingGravity.x ?? 0,
          y: accelerationIncludingGravity.y ?? 0,
          z: accelerationIncludingGravity.z ?? 0,
        },
        rotationRate: {
          alpha: rotationRate.alpha ?? 0,
          beta: rotationRate.beta ?? 0,
          gamma: rotationRate.gamma ?? 0,
        },
        interval: event.interval || 16, // ~60fps default
      })
    }

    window.addEventListener('devicemotion', this.listener)
  }

  async stopListening(): Promise<void> {
    if (this.listener) {
      window.removeEventListener('devicemotion', this.listener)
      this.listener = null
    }
  }
}

/**
 * Native Motion Adapter (uses Capacitor Motion plugin)
 */
class NativeMotionAdapter implements MotionAdapter {
  private isListening = false

  async isAvailable(): Promise<boolean> {
    return isPluginAvailable('Motion')
  }

  async requestPermission(): Promise<boolean> {
    // Capacitor Motion doesn't require explicit permission on iOS/Android
    // Permission is requested automatically when accessing sensors
    return true
  }

  async startListening(callback: (data: MotionData) => void): Promise<void> {
    if (this.isListening) {
      console.warn('Motion listener already active')
      return
    }

    try {
      // Add accelerometer listener
      await Motion.addListener('accel', (event: AccelListenerEvent) => {
        callback({
          acceleration: {
            x: event.acceleration.x,
            y: event.acceleration.y,
            z: event.acceleration.z,
          },
          accelerationIncludingGravity: {
            x: event.accelerationIncludingGravity?.x ?? event.acceleration.x,
            y: event.accelerationIncludingGravity?.y ?? event.acceleration.y,
            z: event.accelerationIncludingGravity?.z ?? event.acceleration.z,
          },
          rotationRate: {
            alpha: event.rotationRate?.alpha ?? 0,
            beta: event.rotationRate?.beta ?? 0,
            gamma: event.rotationRate?.gamma ?? 0,
          },
          interval: event.interval ?? 16,
        })
      })

      this.isListening = true
    } catch (error) {
      console.error('Failed to start motion listening:', error)
      throw error
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return
    }

    try {
      await Motion.removeAllListeners()
      this.isListening = false
    } catch (error) {
      console.error('Failed to stop motion listening:', error)
      throw error
    }
  }
}

/**
 * Server Motion Adapter (no-op for SSR)
 */
class ServerMotionAdapter implements MotionAdapter {
  async isAvailable(): Promise<boolean> {
    return false
  }

  async requestPermission(): Promise<boolean> {
    return false
  }

  async startListening(callback: (data: MotionData) => void): Promise<void> {
    console.warn('Motion not available on server')
  }

  async stopListening(): Promise<void> {
    // No-op
  }
}

/**
 * Get the appropriate motion adapter for the current platform
 */
function getMotionAdapter(): MotionAdapter {
  if (isServer()) {
    return new ServerMotionAdapter()
  }

  if (isNative()) {
    return new NativeMotionAdapter()
  }

  return new WebMotionAdapter()
}

// Export singleton instance
export const motion = getMotionAdapter()

/**
 * Utility: Calculate magnitude of acceleration vector
 */
export function calculateMagnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z)
}

/**
 * Utility: Detect step from acceleration data
 * Uses simple peak detection algorithm
 */
export class StepDetector {
  private lastMagnitude = 0
  private lastPeakTime = 0
  private threshold = 1.2 // Acceleration threshold for step detection
  private minTimeBetweenSteps = 200 // ms (prevents double-counting)

  detectStep(acceleration: { x: number; y: number; z: number }): boolean {
    const magnitude = calculateMagnitude(acceleration.x, acceleration.y, acceleration.z)
    const now = Date.now()

    // Check if magnitude crosses threshold and enough time has passed
    const isPeak = magnitude > this.threshold && magnitude > this.lastMagnitude
    const enoughTimePassed = now - this.lastPeakTime > this.minTimeBetweenSteps

    if (isPeak && enoughTimePassed) {
      this.lastPeakTime = now
      this.lastMagnitude = magnitude
      return true
    }

    this.lastMagnitude = magnitude
    return false
  }

  reset(): void {
    this.lastMagnitude = 0
    this.lastPeakTime = 0
  }
}
