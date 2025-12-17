/**
 * Platform Detection Layer for Capacitor
 *
 * Provides safe platform detection that works across SSR, web, and native environments.
 * This prevents crashes when Capacitor APIs are accessed during server-side rendering.
 */

import { Capacitor } from '@capacitor/core'

export type Platform = 'web' | 'ios' | 'android' | 'server'

/**
 * Get the current platform the app is running on
 *
 * @returns 'server' | 'web' | 'ios' | 'android'
 */
export const getPlatform = (): Platform => {
  // Server-side rendering detection
  if (typeof window === 'undefined') {
    return 'server'
  }

  // Check if running in native environment
  if (!Capacitor.isNativePlatform()) {
    return 'web'
  }

  // Get specific native platform
  return Capacitor.getPlatform() as 'ios' | 'android'
}

/**
 * Check if the app is running on a native platform (iOS or Android)
 */
export const isNative = (): boolean => {
  if (typeof window === 'undefined') return false
  return Capacitor.isNativePlatform()
}

/**
 * Check if the app is running on the web
 */
export const isWeb = (): boolean => {
  if (typeof window === 'undefined') return false
  return !Capacitor.isNativePlatform()
}

/**
 * Check if the app is running on iOS
 */
export const isIOS = (): boolean => {
  return getPlatform() === 'ios'
}

/**
 * Check if the app is running on Android
 */
export const isAndroid = (): boolean => {
  return getPlatform() === 'android'
}

/**
 * Check if the app is running on the server (SSR)
 */
export const isServer = (): boolean => {
  return typeof window === 'undefined'
}

/**
 * Check if a specific Capacitor plugin is available
 *
 * @param pluginName - Name of the plugin to check (e.g., 'Motion', 'BiometricAuth')
 */
export const isPluginAvailable = (pluginName: string): boolean => {
  if (typeof window === 'undefined') return false
  return Capacitor.isPluginAvailable(pluginName)
}

/**
 * Safe wrapper for Capacitor plugin calls that might fail on web
 *
 * @param fn - Function to execute (should be a Capacitor plugin call)
 * @param fallback - Fallback value to return if plugin is unavailable
 */
export const safePluginCall = async <T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> => {
  if (isServer()) {
    return fallback
  }

  try {
    return await fn()
  } catch (error) {
    console.warn('Capacitor plugin call failed, using fallback:', error)
    return fallback
  }
}
