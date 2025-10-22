'use client'

/**
 * Health Sync Utilities
 *
 * Provides platform detection and health app integration utilities
 * Note: This is a PWA, so true native health data access requires native wrappers
 * (React Native, Capacitor, etc.). This provides the UI/UX foundation.
 */

export type Platform = 'ios' | 'android' | 'web' | 'unknown'
export type HealthApp = 'apple-health' | 'google-fit' | 'none'

export interface HealthSyncStatus {
  platform: Platform
  healthApp: HealthApp
  isConnected: boolean
  lastSyncAt?: Date
  syncEnabled: boolean
}

/**
 * Detect user's platform
 */
export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown'

  const userAgent = window.navigator.userAgent.toLowerCase()
  const platform = window.navigator.platform?.toLowerCase() || ''

  // iOS detection
  if (/iphone|ipad|ipod/.test(userAgent) || /iphone|ipad|ipod/.test(platform)) {
    return 'ios'
  }

  // Android detection
  if (/android/.test(userAgent)) {
    return 'android'
  }

  // Check for standalone mode (PWA installed)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true

  if (isStandalone) {
    // Likely a PWA, try to detect based on touch support
    if ('ontouchstart' in window) {
      // Mobile web, default to web
      return 'web'
    }
  }

  return 'web'
}

/**
 * Get health app for platform
 */
export function getHealthAppForPlatform(platform: Platform): HealthApp {
  switch (platform) {
    case 'ios':
      return 'apple-health'
    case 'android':
      return 'google-fit'
    default:
      return 'none'
  }
}

/**
 * Get health app name
 */
export function getHealthAppName(healthApp: HealthApp): string {
  switch (healthApp) {
    case 'apple-health':
      return 'Apple Health'
    case 'google-fit':
      return 'Google Fit'
    default:
      return 'Health App'
  }
}

/**
 * Get health app icon
 */
export function getHealthAppIcon(healthApp: HealthApp): string {
  switch (healthApp) {
    case 'apple-health':
      return '❤️'
    case 'google-fit':
      return '🏃'
    default:
      return '📊'
  }
}

/**
 * Get deep link to open health app
 * Note: These may not work in all browsers/contexts
 */
export function getHealthAppDeepLink(healthApp: HealthApp): string | null {
  switch (healthApp) {
    case 'apple-health':
      // Apple Health deep link (iOS 15+)
      return 'x-apple-health://sources'
    case 'google-fit':
      // Google Fit deep link
      return 'https://play.google.com/store/apps/details?id=com.google.android.apps.fitness'
    default:
      return null
  }
}

/**
 * Open health app (if possible)
 */
export function openHealthApp(healthApp: HealthApp): boolean {
  const deepLink = getHealthAppDeepLink(healthApp)

  if (!deepLink) return false

  try {
    // Try to open deep link
    window.location.href = deepLink
    return true
  } catch (error) {
    console.error('Failed to open health app:', error)
    return false
  }
}

/**
 * Get setup instructions for health app
 */
export function getSetupInstructions(healthApp: HealthApp): string[] {
  switch (healthApp) {
    case 'apple-health':
      return [
        'Open the Apple Health app on your iPhone',
        'Tap your profile icon in the top right',
        'Scroll down to "Apps" section',
        'Find "Weight Loss Project Lab"',
        'Enable "Steps" data access',
        'Return to this app and enable sync'
      ]
    case 'google-fit':
      return [
        'Open Google Fit app on your phone',
        'Tap your profile icon',
        'Go to Settings → Manage connected apps',
        'Find "Weight Loss Project Lab"',
        'Enable "Physical activity" permission',
        'Return to this app and enable sync'
      ]
    default:
      return []
  }
}

/**
 * Get benefits of health sync
 */
export function getHealthSyncBenefits(): string[] {
  return [
    'Automatic step tracking from your health app',
    'No need to keep this app open',
    'More accurate data from phone\'s pedometer',
    'Unified health data across apps',
    'Battery-efficient background sync'
  ]
}

/**
 * Check if health sync is supported
 * In a PWA, this is always somewhat limited without native wrappers
 */
export function isHealthSyncSupported(): boolean {
  const platform = detectPlatform()
  return platform === 'ios' || platform === 'android'
}

/**
 * Get health sync limitations message
 */
export function getHealthSyncLimitations(platform: Platform): string {
  if (platform === 'web') {
    return 'Health app integration is only available on iOS and Android. Use the web app on your mobile device.'
  }

  return 'As a web app (PWA), we use your device\'s motion sensors for automatic step tracking. For full health app integration, native permissions may be required.'
}

/**
 * Simulate checking health permissions
 * In a real native implementation, this would use HealthKit/Google Fit APIs
 */
export async function checkHealthPermissions(healthApp: HealthApp): Promise<boolean> {
  // In a PWA, we can't actually check native health permissions
  // This would require a native wrapper (React Native, Capacitor)

  // For now, return false (user must manually enable)
  return false
}

/**
 * Format last sync time
 */
export function formatLastSync(lastSyncAt?: Date): string {
  if (!lastSyncAt) return 'Never'

  const now = new Date()
  const diff = now.getTime() - lastSyncAt.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`

  return lastSyncAt.toLocaleDateString()
}

/**
 * Get health sync storage key for Firestore
 */
export function getHealthSyncStorageKey(): string {
  return 'healthSync'
}

/**
 * Health sync data structure for Firestore
 */
export interface HealthSyncPreferences {
  enabled: boolean
  platform: Platform
  healthApp: HealthApp
  lastSyncAt?: Date
  createdAt: Date
  updatedAt: Date
}
