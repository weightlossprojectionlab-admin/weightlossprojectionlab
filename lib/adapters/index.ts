/**
 * Capacitor Platform Adapters
 *
 * This module exports unified adapters that provide seamless cross-platform functionality.
 * Each adapter automatically selects the appropriate implementation based on the current
 * platform (server, web, iOS, or Android).
 *
 * Usage:
 * ```ts
 * import { storage, motion, biometric, health } from '@/lib/adapters'
 *
 * // Storage - works on both web (localStorage) and native (Preferences)
 * await storage.setItem('key', 'value')
 * const value = await storage.getItem('key')
 *
 * // Motion - works on both web (DeviceMotion) and native (Capacitor Motion)
 * const available = await motion.isAvailable()
 * await motion.startListening((data) => console.log(data))
 *
 * // Biometric - works on both web (WebAuthn) and native (BiometricAuth)
 * const info = await biometric.checkAvailability()
 * const success = await biometric.authenticate('Login to Weight Loss Lab')
 *
 * // Health - works on native only (HealthKit/Google Fit)
 * const available = await health.isAvailable()
 * const steps = await health.queryData({ ... })
 * ```
 */

// Platform detection
export * from '@/lib/platform'

// Adapters
export { storage, getJSON, setJSON, migrateLocalStorageToPreferences } from './storage'
export type { StorageAdapter } from './storage'

export { motion, calculateMagnitude, StepDetector } from './motion'
export type { MotionData, MotionAdapter } from './motion'

export { biometric, getBiometricTypeName, getBiometricIcon } from './biometric'
export type { BiometricType, BiometricInfo, BiometricAdapter } from './biometric'

export { health, getTodaysSteps, getStepHistory, syncHealthDataToFirebase } from './health'
export type {
  HealthAdapter,
  HealthDataQuery,
  HealthMetricType,
  HealthDataPoint,
  HealthPermissions,
} from './health'
