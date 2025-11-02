'use client'

// Permission management utilities for camera and biometric access

import { logger } from '@/lib/logger'

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported'

export interface PermissionCheckResult {
  status: PermissionStatus
  canRequest: boolean
  message: string
}

// Detect mobile platform
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Detect iOS
export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// Detect Android
export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

// Check if browser supports Permissions API
const supportsPermissionsAPI = (): boolean => {
  return typeof navigator !== 'undefined' && 'permissions' in navigator
}

/**
 * Check camera permission status
 * Note: Safari doesn't support Permissions API, so we use getUserMedia as a test
 */
export const checkCameraPermission = async (): Promise<PermissionCheckResult> => {
  // Check if we're in a browser context
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      status: 'unsupported',
      canRequest: false,
      message: 'Camera access is only available in browser context.'
    }
  }

  // Check if mediaDevices API is available
  if (!navigator.mediaDevices) {
    // mediaDevices is undefined - likely HTTP context or truly unsupported
    const isLocalhost = typeof window !== 'undefined' &&
                       (window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1')

    if (!isLocalhost && window.location.protocol === 'http:') {
      return {
        status: 'unsupported',
        canRequest: false,
        message: 'Camera access requires a secure connection (HTTPS). Please use HTTPS or access via localhost.'
      }
    }

    return {
      status: 'unsupported',
      canRequest: false,
      message: 'Camera access is not supported in this browser. Please use a modern browser like Chrome, Safari, or Firefox.'
    }
  }

  // Check if getUserMedia is available
  if (!navigator.mediaDevices.getUserMedia) {
    return {
      status: 'unsupported',
      canRequest: false,
      message: 'Camera access is not supported in this browser. Please update your browser or use Chrome, Safari, or Firefox.'
    }
  }

  // Try Permissions API first (doesn't work in Safari)
  if (supportsPermissionsAPI()) {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName })

      return {
        status: result.state as PermissionStatus,
        canRequest: result.state === 'prompt',
        message: getPermissionMessage(result.state as PermissionStatus, 'camera')
      }
    } catch (error) {
      // Permissions API failed, fall through to getUserMedia approach
      logger.debug('Permissions API not available, will use getUserMedia')
    }
  }

  // For Safari and browsers without Permissions API, we can't check without requesting
  // Return 'prompt' status as we don't know the actual state
  return {
    status: 'prompt',
    canRequest: true,
    message: 'Camera access has not been requested yet. We\'ll need your permission to use the camera.'
  }
}

/**
 * Request camera permission and return media stream if granted
 */
export const requestCameraPermission = async (): Promise<{
  granted: boolean
  stream?: MediaStream
  error?: string
}> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // Prefer rear camera on mobile
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })

    return {
      granted: true,
      stream
    }
  } catch (error: any) {
    logger.error('Camera permission error', error as Error)

    let errorMessage = 'Unable to access camera. '

    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        errorMessage += 'Permission was denied. Please enable camera access in your device settings.'
        break
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        errorMessage += 'No camera was found on this device.'
        break
      case 'NotReadableError':
      case 'TrackStartError':
        errorMessage += 'Camera is already in use by another application.'
        break
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        errorMessage += 'Camera does not meet the required specifications.'
        break
      case 'TypeError':
        errorMessage += 'Camera access is not supported in this browser.'
        break
      case 'SecurityError':
        errorMessage += 'Camera access is blocked for security reasons. Please use HTTPS.'
        break
      default:
        errorMessage += error.message || 'An unknown error occurred.'
    }

    return {
      granted: false,
      error: errorMessage
    }
  }
}

/**
 * Check if biometric authentication is available and permitted
 */
export const checkBiometricPermission = async (): Promise<PermissionCheckResult> => {
  // Check WebAuthn support
  if (typeof window === 'undefined' ||
      !('credentials' in navigator) ||
      typeof window.PublicKeyCredential === 'undefined') {
    return {
      status: 'unsupported',
      canRequest: false,
      message: 'Biometric authentication is not supported in this browser.'
    }
  }

  try {
    // Check if platform authenticator is available
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()

    if (!available) {
      return {
        status: 'unsupported',
        canRequest: false,
        message: 'Your device does not support biometric authentication (Touch ID, Face ID, or fingerprint).'
      }
    }

    // WebAuthn is available, but we can't check permission status without attempting registration
    return {
      status: 'prompt',
      canRequest: true,
      message: 'Biometric authentication is available on this device.'
    }
  } catch (error) {
    logger.error('Biometric check error', error as Error)
    return {
      status: 'unsupported',
      canRequest: false,
      message: 'Unable to check biometric authentication availability.'
    }
  }
}

/**
 * Get user-friendly permission message
 */
const getPermissionMessage = (status: PermissionStatus, type: 'camera' | 'biometric'): string => {
  const typeName = type === 'camera' ? 'camera' : 'biometric authentication'

  switch (status) {
    case 'granted':
      return `${typeName.charAt(0).toUpperCase() + typeName.slice(1)} access is enabled.`
    case 'denied':
      if (isIOS()) {
        return `${typeName.charAt(0).toUpperCase() + typeName.slice(1)} access is denied. Go to Settings > Safari > ${type === 'camera' ? 'Camera' : 'Privacy'} to enable it.`
      } else if (isAndroid()) {
        return `${typeName.charAt(0).toUpperCase() + typeName.slice(1)} access is denied. Go to Settings > Apps > Browser > Permissions to enable it.`
      } else {
        return `${typeName.charAt(0).toUpperCase() + typeName.slice(1)} access is denied. Please check your browser settings.`
      }
    case 'prompt':
      return `We'll ask for your permission to use ${typeName}.`
    case 'unsupported':
      return `${typeName.charAt(0).toUpperCase() + typeName.slice(1)} is not supported on this device or browser.`
    default:
      return `Unable to determine ${typeName} permission status.`
  }
}

/**
 * Get platform-specific settings instructions
 */
export const getSettingsInstructions = (type: 'camera' | 'biometric'): string => {
  if (isIOS()) {
    if (type === 'camera') {
      return 'Open Settings app → Safari → Camera → Allow'
    } else {
      return 'Open Settings app → Face ID & Passcode (or Touch ID & Passcode)'
    }
  } else if (isAndroid()) {
    if (type === 'camera') {
      return 'Open Settings → Apps → Your Browser → Permissions → Camera → Allow'
    } else {
      return 'Open Settings → Security → Fingerprint (or Face unlock)'
    }
  } else {
    if (type === 'camera') {
      return 'Open your browser settings and look for Site Permissions → Camera'
    } else {
      return 'Check your system settings for biometric authentication options'
    }
  }
}

/**
 * Open device settings (where supported)
 * Note: This doesn't work on most browsers for security reasons,
 * but we provide instructions instead
 */
export const openSettings = (type: 'camera' | 'biometric'): void => {
  const instructions = getSettingsInstructions(type)
  alert(`To enable ${type === 'camera' ? 'camera' : 'biometric'} access:\n\n${instructions}`)
}

/**
 * Test camera access without keeping the stream
 * Useful for checking permission status
 */
export const testCameraAccess = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    // Stop the stream immediately
    stream.getTracks().forEach(track => track.stop())
    return true
  } catch (error) {
    return false
  }
}
