'use client'

// WebAuthn utility functions for biometric authentication

import { getErrorMessage } from '@/types/common'
import { logger } from '@/lib/logger'

export interface BiometricCredential {
  id: string
  rawId: ArrayBuffer
  response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse
  type: 'public-key'
}

interface StoredCredential {
  id: string
  createdAt?: string
  lastUsed?: string
}

// Check if WebAuthn is supported
export const isWebAuthnSupported = (): boolean => {
  return typeof window !== 'undefined' &&
         'credentials' in navigator &&
         'create' in navigator.credentials &&
         typeof window.PublicKeyCredential !== 'undefined'
}

// Check if the device supports biometric authentication
export const isBiometricSupported = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false

  try {
    // Check if platform authenticator (Touch ID, Face ID, Windows Hello) is available
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    return available
  } catch (error) {
    logger.error('Error checking biometric support', error as Error)
    return false
  }
}

// Check biometric permission status with detailed result
export const checkBiometricPermissionStatus = async (): Promise<{
  supported: boolean
  available: boolean
  message: string
}> => {
  if (!isWebAuthnSupported()) {
    return {
      supported: false,
      available: false,
      message: 'Biometric authentication is not supported in this browser. Please use a browser that supports WebAuthn.'
    }
  }

  try {
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()

    if (!available) {
      // Detect platform for specific message
      const userAgent = navigator.userAgent.toLowerCase()
      let deviceMessage = 'Your device does not support biometric authentication.'

      if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        deviceMessage = 'Face ID or Touch ID is not available on this device. Please ensure it is set up in Settings > Face ID & Passcode (or Touch ID & Passcode).'
      } else if (userAgent.includes('android')) {
        deviceMessage = 'Fingerprint authentication is not available. Please ensure it is set up in Settings > Security > Fingerprint.'
      } else if (userAgent.includes('windows')) {
        deviceMessage = 'Windows Hello is not available. Please set it up in Settings > Accounts > Sign-in options.'
      } else if (userAgent.includes('mac')) {
        deviceMessage = 'Touch ID is not available on this Mac or not set up in System Preferences > Touch ID.'
      }

      return {
        supported: true, // WebAuthn is supported
        available: false, // But no biometric authenticator
        message: deviceMessage
      }
    }

    return {
      supported: true,
      available: true,
      message: 'Biometric authentication is ready to use.'
    }
  } catch (error) {
    logger.error('Error checking biometric permission', error as Error)
    return {
      supported: false,
      available: false,
      message: 'Unable to check biometric authentication. Please try again.'
    }
  }
}

// Generate a random challenge
const generateChallenge = (): Uint8Array => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return array
}

// Convert ArrayBuffer to base64url
const arrayBufferToBase64url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Convert base64url to ArrayBuffer
const base64urlToArrayBuffer = (base64url: string): ArrayBuffer => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Register a new biometric credential
export const registerBiometric = async (userId: string, userEmail: string): Promise<string> => {
  // Check permission status first
  const permissionStatus = await checkBiometricPermissionStatus()

  if (!permissionStatus.supported) {
    throw new Error('Biometric authentication is not supported in this browser. Please use a modern browser.')
  }

  if (!permissionStatus.available) {
    throw new Error(permissionStatus.message)
  }

  const challenge = generateChallenge()

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge: challenge as BufferSource,
    rp: {
      name: 'Weight Loss Progress Lab',
      id: window.location.hostname,
    },
    user: {
      id: new TextEncoder().encode(userId),
      name: userEmail,
      displayName: userEmail,
    },
    pubKeyCredParams: [
      {
        alg: -7, // ES256
        type: 'public-key',
      },
      {
        alg: -257, // RS256
        type: 'public-key',
      },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Built-in authenticators only
      userVerification: 'required', // Require biometric verification
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'direct',
  }

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential

    if (!credential) {
      throw new Error('Failed to create credential')
    }

    // Return the credential ID for storage
    const credentialId = arrayBufferToBase64url(credential.rawId)

    logger.info('Biometric credential registered:', { credentialId })

    // Save credential to Firebase
    try {
      const { getAuth } = await import('firebase/auth')
      const firebaseAuth = getAuth()
      const currentUser = firebaseAuth.currentUser

      if (!currentUser) {
        throw new Error('No authenticated user found')
      }

      const token = await currentUser.getIdToken()

      const response = await fetch('/api/user-profile/biometric', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ credentialId }),
      })

      if (!response.ok) {
        const error = await response.json()
        logger.error('Failed to save credential to Firebase', new Error(JSON.stringify(error)))
        // Continue anyway, store in localStorage as fallback
        localStorage.setItem(`biometric_${userId}`, credentialId)
      } else {
        logger.info('Credential successfully saved to Firebase')
        // Also store in localStorage for backward compatibility
        localStorage.setItem(`biometric_${userId}`, credentialId)
      }
    } catch (firebaseError) {
      logger.error('Error saving to Firebase', firebaseError as Error)
      // Fallback to localStorage only
      localStorage.setItem(`biometric_${userId}`, credentialId)
    }

    return credentialId

  } catch (error: unknown) {
    logger.error('Biometric registration failed', error as Error)

    const errorName = error instanceof Error ? error.name : ''
    if (errorName === 'NotAllowedError') {
      throw new Error('Biometric registration was cancelled or denied')
    } else if (errorName === 'InvalidStateError') {
      throw new Error('This device is already registered for biometric authentication')
    } else if (errorName === 'NotSupportedError') {
      throw new Error('Biometric authentication is not supported on this device')
    } else {
      throw new Error('Failed to register biometric authentication')
    }
  }
}

// Authenticate using biometric
export const authenticateBiometric = async (userId: string): Promise<boolean> => {
  // Check permission status first
  const permissionStatus = await checkBiometricPermissionStatus()

  if (!permissionStatus.supported) {
    throw new Error('Biometric authentication is not supported in this browser. Please use a modern browser.')
  }

  if (!permissionStatus.available) {
    throw new Error(permissionStatus.message)
  }

  // Get stored credential ID
  const credentialId = localStorage.getItem(`biometric_${userId}`)
  if (!credentialId) {
    throw new Error('No biometric credentials found. Please register first.')
  }

  const challenge = generateChallenge()

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: challenge as BufferSource,
    allowCredentials: [
      {
        id: base64urlToArrayBuffer(credentialId),
        type: 'public-key',
        transports: ['internal'], // Platform authenticator
      },
    ],
    userVerification: 'required',
    timeout: 60000,
  }

  try {
    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential

    if (!credential) {
      throw new Error('Authentication failed')
    }

    logger.info('Biometric authentication successful')

    // Update last used timestamp in Firebase
    try {
      const { getAuth } = await import('firebase/auth')
      const firebaseAuth = getAuth()
      const currentUser = firebaseAuth.currentUser

      if (currentUser && credentialId) {
        const token = await currentUser.getIdToken()

        await fetch('/api/user-profile/biometric', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ credentialId }),
        })
      }
    } catch (updateError) {
      logger.error('Failed to update lastUsed timestamp', updateError as Error)
      // Don't fail the authentication if timestamp update fails
    }

    return true

  } catch (error: unknown) {
    logger.error('Biometric authentication failed', error as Error)

    const errorName = error instanceof Error ? error.name : ''
    if (errorName === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled or denied')
    } else if (errorName === 'InvalidStateError') {
      throw new Error('Invalid biometric authentication state')
    } else {
      throw new Error('Biometric authentication failed')
    }
  }
}

// Check if user has registered biometric authentication
export const hasBiometricCredential = async (userId: string): Promise<boolean> => {
  try {
    const { getAuth } = await import('firebase/auth')
    const firebaseAuth = getAuth()
    const currentUser = firebaseAuth.currentUser

    if (!currentUser) {
      // Fallback to localStorage if not authenticated
      const credentialId = localStorage.getItem(`biometric_${userId}`)
      return !!credentialId
    }

    const token = await currentUser.getIdToken()

    const response = await fetch('/api/user-profile/biometric', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // Fallback to localStorage on error
      const credentialId = localStorage.getItem(`biometric_${userId}`)
      return !!credentialId
    }

    const data = await response.json()
    return data.count > 0
  } catch (error) {
    logger.error('Error checking biometric credential', error as Error)
    // Fallback to localStorage
    const credentialId = localStorage.getItem(`biometric_${userId}`)
    return !!credentialId
  }
}

// Remove biometric credential
export const removeBiometricCredential = async (userId: string): Promise<void> => {
  // First, try to remove from Firebase
  try {
    const { getAuth } = await import('firebase/auth')
    const firebaseAuth = getAuth()
    const currentUser = firebaseAuth.currentUser

    if (currentUser) {
      const token = await currentUser.getIdToken()

      // Get the credential ID from localStorage (needed for DELETE request)
      const credentialId = localStorage.getItem(`biometric_${userId}`)

      if (credentialId) {
        const response = await fetch('/api/user-profile/biometric', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ credentialId }),
        })

        if (!response.ok) {
          logger.error('Failed to remove credential from Firebase', new Error('Failed to remove credential'))
        }
      }
    }
  } catch (error) {
    logger.error('Error removing biometric credential from Firebase', error as Error)
  }

  // Always remove from localStorage
  localStorage.removeItem(`biometric_${userId}`)
}

// Get biometric status for a user
export const getBiometricStatus = async (userId: string): Promise<{
  supported: boolean
  enabled: boolean
  deviceType: string
}> => {
  const supported = await isBiometricSupported()
  const enabled = await hasBiometricCredential(userId)

  let deviceType = 'Unknown'
  if (typeof window !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      deviceType = 'iOS (Touch ID / Face ID)'
    } else if (userAgent.includes('android')) {
      deviceType = 'Android (Fingerprint)'
    } else if (userAgent.includes('windows')) {
      deviceType = 'Windows (Windows Hello)'
    } else if (userAgent.includes('mac')) {
      deviceType = 'macOS (Touch ID)'
    }
  }

  return { supported, enabled, deviceType }
}

// Migrate localStorage credentials to Firebase
export const migrateLocalStorageCredentials = async (userId: string): Promise<boolean> => {
  try {
    // Check if there's a credential in localStorage
    const credentialId = localStorage.getItem(`biometric_${userId}`)

    if (!credentialId) {
      return false // Nothing to migrate
    }

    const { getAuth } = await import('firebase/auth')
    const firebaseAuth = getAuth()
    const currentUser = firebaseAuth.currentUser

    if (!currentUser) {
      logger.debug('Cannot migrate: No authenticated user')
      return false
    }

    // Check if it already exists in Firebase
    const token = await currentUser.getIdToken()

    const checkResponse = await fetch('/api/user-profile/biometric', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (checkResponse.ok) {
      const data = await checkResponse.json() as { credentials?: StoredCredential[] }

      // Check if this exact credential already exists
      const credentialExists = data.credentials?.some((cred: StoredCredential) => cred.id === credentialId)

      if (credentialExists) {
        logger.info('Credential already exists in Firebase, skipping migration')
        return true
      }
    }

    // Migrate the credential
    const response = await fetch('/api/user-profile/biometric', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ credentialId }),
    })

    if (response.ok) {
      logger.info('Successfully migrated localStorage credential to Firebase')
      return true
    } else {
      const error = await response.json()
      logger.error('Failed to migrate credential', new Error(JSON.stringify(error)))
      return false
    }
  } catch (error) {
    logger.error('Error migrating localStorage credentials', error as Error)
    return false
  }
}

// Get user-friendly error messages
export const getBiometricErrorMessage = (error: unknown): string => {
  if (!error) return 'Unknown error occurred'

  const errorName = error instanceof Error ? error.name : ''
  const errorMessage = error instanceof Error ? error.message : ''

  switch (errorName) {
    case 'NotAllowedError':
      return 'Permission denied. Please allow biometric authentication and try again.'
    case 'InvalidStateError':
      return 'Biometric authentication is already set up for this device.'
    case 'NotSupportedError':
      return 'Biometric authentication is not supported on this device or browser.'
    case 'SecurityError':
      return 'Security error. Please ensure you are using HTTPS and try again.'
    case 'AbortError':
      return 'Authentication was cancelled. Please try again.'
    case 'ConstraintError':
      return 'Device constraints not met. Please check your biometric settings.'
    case 'NotReadableError':
      return 'Biometric sensor is not available. Please try again later.'
    case 'UnknownError':
      return 'An unknown error occurred. Please try again.'
    default:
      return errorMessage || 'Biometric authentication failed. Please try again.'
  }
}

// Test biometric availability with detailed info
export const testBiometricCapabilities = async (): Promise<{
  webauthnSupported: boolean
  platformAuthenticatorAvailable: boolean
  conditionalMediationSupported: boolean
  userVerifyingPlatformAuthenticatorAvailable: boolean
}> => {
  const result = {
    webauthnSupported: false,
    platformAuthenticatorAvailable: false,
    conditionalMediationSupported: false,
    userVerifyingPlatformAuthenticatorAvailable: false
  }

  if (!isWebAuthnSupported()) {
    return result
  }

  result.webauthnSupported = true

  try {
    result.userVerifyingPlatformAuthenticatorAvailable =
      await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch (error) {
    logger.warn('Could not check platform authenticator availability', { error: error instanceof Error ? error.message : String(error) })
  }

  try {
    // Check for conditional mediation support (future feature)
    result.conditionalMediationSupported =
      await PublicKeyCredential.isConditionalMediationAvailable?.() || false
  } catch (error) {
    logger.warn('Conditional mediation not supported', { error: error instanceof Error ? error.message : String(error) })
  }

  return result
}